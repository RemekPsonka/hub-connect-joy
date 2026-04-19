// SGU-07: Worker for web prospecting jobs (cron + manual). 1 job per tick.
// Supports source_type: 'rss' | 'html' | 'api'.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { XMLParser } from 'npm:fast-xml-parser@4.3.6';
import { parseHTML } from 'npm:linkedom@0.16.11';
import { callLLM } from '../_shared/llm-provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Job {
  id: string;
  tenant_id: string;
  actor_user_id: string | null;
  payload: { source_id?: string };
  result: { items_processed?: number; candidates_added?: number } | null;
  status: string;
  progress: number;
}

interface WebSource {
  id: string;
  tenant_id: string;
  name: string;
  url: string;
  source_type: 'rss' | 'html' | 'api';
  parser_config: Record<string, unknown>;
  search_keywords: string[] | null;
}

interface RawItem {
  title: string;
  description: string;
  url: string;
}

const ITEMS_PER_TICK = 30;
const SLEEP_BETWEEN_MS = 800;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchRSS(url: string): Promise<RawItem[]> {
  const res = await fetch(url, { headers: { 'User-Agent': 'SGU-Prospecting/1.0' } });
  if (!res.ok) throw new Error(`RSS fetch ${res.status}`);
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(xml);
  const items: any[] =
    parsed?.rss?.channel?.item ??
    parsed?.feed?.entry ??
    parsed?.['rdf:RDF']?.item ??
    [];
  const arr = Array.isArray(items) ? items : [items];
  return arr.slice(0, ITEMS_PER_TICK).map((it: any) => ({
    title: String(it.title?.['#text'] ?? it.title ?? '').trim(),
    description: String(it.description ?? it.summary ?? it['content:encoded'] ?? '')
      .replace(/<[^>]+>/g, ' ')
      .slice(0, 1500),
    url: String(it.link?.['@_href'] ?? it.link ?? it.guid ?? url),
  })).filter((it) => it.title.length > 0);
}

async function fetchHTML(url: string, config: Record<string, unknown>): Promise<RawItem[]> {
  const res = await fetch(url, { headers: { 'User-Agent': 'SGU-Prospecting/1.0' } });
  if (!res.ok) throw new Error(`HTML fetch ${res.status}`);
  const html = await res.text();
  const { document } = parseHTML(html);
  const itemSelector = (config.item_selector as string) ?? 'article';
  const titleSelector = (config.title_selector as string) ?? 'h2, h3, .title';
  const linkSelector = (config.link_selector as string) ?? 'a';
  const descSelector = (config.description_selector as string) ?? 'p';

  const nodes = Array.from(document.querySelectorAll(itemSelector)).slice(0, ITEMS_PER_TICK);
  return nodes.map((n: any) => {
    const titleEl = n.querySelector(titleSelector);
    const linkEl = n.querySelector(linkSelector);
    const descEl = n.querySelector(descSelector);
    return {
      title: (titleEl?.textContent ?? '').trim(),
      description: (descEl?.textContent ?? '').trim().slice(0, 1500),
      url: linkEl?.getAttribute?.('href') ?? url,
    };
  }).filter((it) => it.title.length > 0);
}

async function fetchAPI(url: string, config: Record<string, unknown>): Promise<RawItem[]> {
  const headers = (config.headers as Record<string, string>) ?? {};
  const res = await fetch(url, { headers: { 'User-Agent': 'SGU-Prospecting/1.0', ...headers } });
  if (!res.ok) throw new Error(`API fetch ${res.status}`);
  const data = await res.json();
  const itemsPath = (config.items_path as string) ?? 'items';
  const titleField = (config.title_field as string) ?? 'title';
  const descField = (config.description_field as string) ?? 'description';
  const urlField = (config.url_field as string) ?? 'url';

  const items: any[] = itemsPath.split('.').reduce((acc, key) => acc?.[key], data) ?? [];
  return items.slice(0, ITEMS_PER_TICK).map((it: any) => ({
    title: String(it[titleField] ?? '').trim(),
    description: String(it[descField] ?? '').slice(0, 1500),
    url: String(it[urlField] ?? url),
  })).filter((it) => it.title.length > 0);
}

function matchKeywords(item: RawItem, keywords: string[] | null): boolean {
  if (!keywords || keywords.length === 0) return true;
  const text = (item.title + ' ' + item.description).toLowerCase();
  return keywords.some((k) => text.includes(k.toLowerCase()));
}

async function classifyLead(item: RawItem): Promise<{
  is_lead: boolean;
  score: number;
  reasoning: string;
  extracted: { name: string; phone?: string; email?: string };
  model: string;
}> {
  const prompt = `Analizujesz wpis ze źródła web pod kątem leadu B2B dla agencji ubezpieczeniowej w Polsce.

Tytuł: ${item.title}
Treść: ${item.description}
URL: ${item.url}

Zwróć WYŁĄCZNIE poprawny JSON:
{
  "is_lead": boolean,
  "score": liczba 0-100,
  "reasoning": "krótko po polsku, max 2 zdania",
  "extracted": { "name": "nazwa firmy/osoby z wpisu", "phone": "opcjonalnie", "email": "opcjonalnie" }
}`;

  try {
    const result = await callLLM({
      messages: [
        { role: 'system', content: 'Klasyfikujesz leady B2B dla branży ubezpieczeń. Odpowiadasz TYLKO poprawnym JSON.' },
        { role: 'user', content: prompt },
      ],
      stream: false,
      context: { function_name: 'sgu-prospecting-web-worker', persona: 'sgu_web_classifier' },
    });

    const text = result.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no_json');
    const parsed = JSON.parse(match[0]);
    return {
      is_lead: Boolean(parsed.is_lead),
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      reasoning: String(parsed.reasoning ?? '').slice(0, 500),
      extracted: {
        name: String(parsed.extracted?.name ?? item.title).slice(0, 200),
        phone: parsed.extracted?.phone ? String(parsed.extracted.phone).slice(0, 30) : undefined,
        email: parsed.extracted?.email ? String(parsed.extracted.email).slice(0, 100) : undefined,
      },
      model: result.model,
    };
  } catch (e) {
    console.error('LLM classify fail:', (e as Error).message);
    return {
      is_lead: false,
      score: 0,
      reasoning: 'AI klasyfikacja nie powiodła się.',
      extracted: { name: item.title.slice(0, 200) },
      model: 'fallback',
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get('CRON_SECRET');
  const headerSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const isServiceRole = authHeader === `Bearer ${serviceKey}` && serviceKey.length > 0;
  const isCronSecret = cronSecret && headerSecret === cronSecret;
  if (!isServiceRole && !isCronSecret) return json({ error: 'unauthorized' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);

  // Pobierz 1 pending job typu web
  const { data: jobs, error: jobErr } = await supabase.rpc('sgu_next_prospecting_job', {
    p_job_type: 'sgu_web_prospecting',
  });
  if (jobErr) {
    console.error('next_job RPC error:', jobErr);
    return json({ error: 'rpc_failed', detail: jobErr.message }, 500);
  }
  const jobRows = (jobs ?? []) as Job[];
  if (jobRows.length === 0) return json({ status: 'idle' });

  const job = jobRows[0];
  const sourceId = job.payload?.source_id;
  if (!sourceId) {
    await supabase.from('background_jobs').update({
      status: 'failed', error: 'missing source_id', finished_at: new Date().toISOString(),
    }).eq('id', job.id);
    return json({ error: 'missing_source_id' }, 400);
  }

  const { data: srcData, error: srcErr } = await supabase
    .from('sgu_web_sources')
    .select('id, tenant_id, name, url, source_type, parser_config, search_keywords')
    .eq('id', sourceId)
    .single();

  if (srcErr || !srcData) {
    await supabase.from('background_jobs').update({
      status: 'failed', error: 'source_not_found', finished_at: new Date().toISOString(),
    }).eq('id', job.id);
    return json({ error: 'source_not_found' }, 404);
  }

  const source = srcData as unknown as WebSource;
  const runStart = new Date().toISOString();
  const { data: runRow } = await supabase.from('sgu_web_source_runs').insert({
    tenant_id: source.tenant_id,
    source_id: source.id,
    job_id: job.id,
    started_at: runStart,
    status: 'running',
  }).select('id').single();

  let added = 0;
  let itemsFound = 0;
  const errors: string[] = [];

  try {
    let items: RawItem[];
    if (source.source_type === 'rss') items = await fetchRSS(source.url);
    else if (source.source_type === 'html') items = await fetchHTML(source.url, source.parser_config);
    else items = await fetchAPI(source.url, source.parser_config);

    itemsFound = items.length;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!matchKeywords(it, source.search_keywords)) continue;

      const cls = await classifyLead(it);
      if (!cls.is_lead || cls.score < 30) {
        await sleep(SLEEP_BETWEEN_MS);
        continue;
      }

      const { error: insErr } = await supabase.from('sgu_prospecting_candidates').insert({
        tenant_id: source.tenant_id,
        source: 'web',
        source_job_id: job.id,
        name: cls.extracted.name,
        phone: cls.extracted.phone ?? null,
        email: cls.extracted.email ?? null,
        website: it.url,
        status: 'pending_review',
        ai_score: cls.score,
        ai_reasoning: `[${source.name}] ${cls.reasoning}`,
        ai_model: cls.model,
      });

      if (insErr) {
        if (!insErr.message?.includes('duplicate key')) errors.push(insErr.message);
      } else {
        added++;
      }

      if (i % 5 === 4) {
        await supabase.from('background_jobs').update({
          progress: Math.min(99, Math.round(((i + 1) / items.length) * 100)),
          updated_at: new Date().toISOString(),
        }).eq('id', job.id);
      }

      await sleep(SLEEP_BETWEEN_MS);
    }

    const finishedAt = new Date().toISOString();
    await supabase.from('background_jobs').update({
      status: 'completed',
      progress: 100,
      finished_at: finishedAt,
      result: { items_processed: itemsFound, candidates_added: added, errors: errors.slice(0, 10) },
    }).eq('id', job.id);

    if (runRow?.id) {
      await supabase.from('sgu_web_source_runs').update({
        finished_at: finishedAt,
        items_found: itemsFound,
        candidates_added: added,
        status: errors.length > 0 ? 'completed_with_errors' : 'completed',
        error: errors.length > 0 ? errors.join('; ').slice(0, 500) : null,
      }).eq('id', runRow.id);
    }

    await supabase.from('sgu_web_sources').update({
      last_scraped_at: finishedAt,
      last_result_count: added,
      last_error: null,
    }).eq('id', source.id);

    return json({ status: 'completed', job_id: job.id, items_found: itemsFound, candidates_added: added });
  } catch (e) {
    const errMsg = (e as Error).message;
    console.error('web worker error:', errMsg);
    await supabase.from('background_jobs').update({
      status: 'failed',
      error: errMsg,
      finished_at: new Date().toISOString(),
      result: { items_processed: itemsFound, candidates_added: added },
    }).eq('id', job.id);

    if (runRow?.id) {
      await supabase.from('sgu_web_source_runs').update({
        finished_at: new Date().toISOString(),
        items_found: itemsFound,
        candidates_added: added,
        status: 'failed',
        error: errMsg.slice(0, 500),
      }).eq('id', runRow.id);
    }

    await supabase.from('sgu_web_sources').update({
      last_scraped_at: new Date().toISOString(),
      last_error: errMsg.slice(0, 500),
    }).eq('id', source.id);

    return json({ status: 'failed', error: errMsg }, 500);
  }
});
