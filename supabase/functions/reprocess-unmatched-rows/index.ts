// Re-przetwarza policy_import_rows o statusie 'unmatched_client' po dopasowaniu klienta.
// Wywoływane przez UI po `match_import_client(external_code, company_id)`.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const POLICY_TYPE_MAP: Record<string, string> = {
  'Ubezpieczenia komunikacyjne': 'fleet',
  'Gwarancja': 'other',
  'Gwarancja ubezpieczeniowa': 'other',
  'Ubezpieczenia majątkowe': 'property',
  'Odpowiedzialność cywilna': 'liability',
  'Cargo': 'fleet',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function toNumber(v: unknown, def = 0): number {
  if (v == null || v === '') return def;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/\s|\u00a0|PLN|zł/gi, '').replace(/\./g, (m, i, str) =>
    str.includes(',') ? '' : m,
  ).replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? def : n;
}

function toIsoDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'string') {
    const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseFirstInstallment(raw: unknown) {
  if (raw == null || raw === '') return { status: null as string | null, date: null as string | null, raw: null as string | null };
  const s = String(raw).trim();
  let m = s.match(/^zapłacona (\d{2}\.\d{2}\.\d{4})$/);
  if (m) return { status: 'paid', date: toIsoDate(m[1]), raw: s };
  m = s.match(/^częściowo zapłacone (\d{2}\.\d{2}\.\d{4})$/);
  if (m) return { status: 'partial', date: toIsoDate(m[1]), raw: s };
  if (s === 'dodany/a') return { status: 'added', date: null, raw: s };
  return { status: null, date: null, raw: s };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const auth = await verifyAuth(req, supabaseAdmin);
    if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);
    if (auth.userType !== 'director') return json({ error: 'not_a_director' }, 403);
    const tenantId = auth.tenantId;

    let body: { external_code?: string } = {};
    try { body = await req.json(); } catch { /* empty body OK */ }
    const filterExternalCode = body.external_code?.trim() || null;

    let q = supabaseAdmin
      .from('policy_import_rows')
      .select('id, batch_id, row_number_in_file, raw_data, dedup_hash, external_client_nip, external_client_name, notes')
      .eq('tenant_id', tenantId)
      .eq('match_status', 'unmatched_client');
    if (filterExternalCode) q = q.eq('external_client_nip', filterExternalCode);
    const { data: rowsToProcess, error: fetchErr } = await q;
    if (fetchErr) return json({ error: 'fetch_failed', details: fetchErr }, 500);
    if (!rowsToProcess || rowsToProcess.length === 0) {
      return json({ reprocessed: 0, new_entries: 0, still_unmatched: 0, errors: [] });
    }

    const codes = [...new Set(rowsToProcess.map((r) => r.external_client_nip).filter(Boolean))];
    const { data: mappings } = await supabaseAdmin
      .from('import_client_mappings')
      .select('external_code, company_id')
      .eq('tenant_id', tenantId)
      .eq('external_source', 'excel')
      .in('external_code', codes);
    const mappingByCode = new Map((mappings ?? []).map((m) => [m.external_code, m.company_id]));

    const masterNumbers = [
      ...new Set(rowsToProcess.map((r) => String((r.raw_data as Record<string, unknown>)['Numer polisy'] ?? '').trim()).filter(Boolean)),
    ];
    const { data: existingPolicies } = await supabaseAdmin
      .from('insurance_policies')
      .select('id, master_policy_number')
      .eq('tenant_id', tenantId)
      .in('master_policy_number', masterNumbers);
    const policyByMaster = new Map((existingPolicies ?? []).map((p) => [p.master_policy_number, p.id]));

    const dedupHashes = rowsToProcess.map((r) => r.dedup_hash).filter(Boolean);
    const { data: existingEntries } = await supabaseAdmin
      .from('policy_entries')
      .select('dedup_hash')
      .eq('tenant_id', tenantId)
      .in('dedup_hash', dedupHashes);
    const seenInDb = new Set((existingEntries ?? []).map((e) => e.dedup_hash));

    let reprocessed = 0;
    let stillUnmatched = 0;
    const errors: { row_id: string; reason: string }[] = [];
    const policiesToInsert: { _master: string; payload: Record<string, unknown> }[] = [];
    const entryInserts: { rowId: string; entry: Record<string, unknown> & { _master_for_lookup: string } }[] = [];

    for (const row of rowsToProcess) {
      reprocessed++;
      const r = row.raw_data as Record<string, unknown>;
      const code = row.external_client_nip;
      const companyId = code ? mappingByCode.get(code) : null;

      if (!companyId) {
        stillUnmatched++;
        continue;
      }

      if (seenInDb.has(row.dedup_hash)) {
        await supabaseAdmin
          .from('policy_import_rows')
          .update({
            match_status: 'duplicate_skipped',
            notes: (row.notes ?? '') + `|reprocessed_to_duplicate:${new Date().toISOString()}`,
          })
          .eq('id', row.id);
        continue;
      }

      const numerPolisy = String(r['Numer polisy'] ?? '').trim();
      const dataWyst = toIsoDate(r['Data wystawienia']);
      const dataStart = toIsoDate(r['Data startu']);
      const dataKonca = toIsoDate(r['Data końca']);
      if (!numerPolisy || !dataWyst || !dataStart || !dataKonca) {
        errors.push({ row_id: row.id, reason: 'missing_required_fields_in_raw_data' });
        continue;
      }

      if (!policyByMaster.has(numerPolisy)) {
        policiesToInsert.push({
          _master: numerPolisy,
          payload: {
            tenant_id: tenantId,
            company_id: companyId,
            master_policy_number: numerPolisy,
            policy_number: numerPolisy,
            policy_name: String(r['Produkt'] ?? 'Polisa'),
            policy_type: POLICY_TYPE_MAP[String(r['Produkt'] ?? '')] ?? 'other',
            insurer_name: String(r['Towarzystwo Ubezpieczeń'] ?? ''),
            start_date: dataStart,
            end_date: dataKonca,
            external_source: 'excel',
            external_client_code: code,
            first_imported_at: new Date().toISOString(),
            last_imported_at: new Date().toISOString(),
          },
        });
        // mark as queued so we don't double-insert
        policyByMaster.set(numerPolisy, '__pending__');
      }

      const fi = parseFirstInstallment(r['Pierwsza rata']);
      entryInserts.push({
        rowId: row.id,
        entry: {
          tenant_id: tenantId,
          _master_for_lookup: numerPolisy,
          issue_date: dataWyst,
          start_date: dataStart,
          end_date: dataKonca,
          cancelled_at: toIsoDate(r['Data anulowania']),
          sale_type: r['Typ sprzedaży'] ? String(r['Typ sprzedaży']) : null,
          premium_assigned: toNumber(r['Składka przypisana']),
          discount: toNumber(r['Zniżka']),
          payment_due: toNumber(r['Płatność należna']),
          commission_pct: toNumber(r['Prowizja (%)']),
          commission_gross: toNumber(r['Prowizja brutto']),
          commission_net: toNumber(r['Prowizja']),
          first_installment_status: fi.status,
          first_installment_date: fi.date,
          first_installment_raw: fi.raw,
          insurer_name: String(r['Towarzystwo Ubezpieczeń'] ?? ''),
          product_name: String(r['Produkt'] ?? ''),
          subject_text: r['Przedmiot ubezpieczenia'] ? String(r['Przedmiot ubezpieczenia']) : null,
          client_group: r['Grupa Klientów'] ? String(r['Grupa Klientów']) : null,
          client_type: r['Typ klienta'] ? String(r['Typ klienta']) : null,
          seller_raw: String(r['Sprzedawca'] ?? ''),
          issuer_raw: String(r['Osoba wystawiająca polisę'] ?? ''),
          from_offer: r['Polisa wystawiona z oferty'] ? String(r['Polisa wystawiona z oferty']) : null,
          dedup_hash: row.dedup_hash,
        },
      });
    }

    if (policiesToInsert.length > 0) {
      const uniqueByMaster = Array.from(new Map(policiesToInsert.map((p) => [p._master, p.payload])).values());
      const { data: ins, error: insErr } = await supabaseAdmin
        .from('insurance_policies')
        .insert(uniqueByMaster)
        .select('id, master_policy_number');
      if (insErr) return json({ error: 'policy_insert_failed', details: insErr }, 500);
      (ins ?? []).forEach((p) => policyByMaster.set(p.master_policy_number, p.id));
    }

    const finalEntries = entryInserts
      .map(({ rowId, entry }) => {
        const { _master_for_lookup, ...rest } = entry;
        const policyId = policyByMaster.get(_master_for_lookup);
        if (!policyId || policyId === '__pending__') {
          errors.push({ row_id: rowId, reason: 'policy_id_unresolved_after_insert' });
          return null;
        }
        return { rowId, entry: { ...rest, insurance_policy_id: policyId } };
      })
      .filter((x): x is { rowId: string; entry: Record<string, unknown> } => x !== null);

    const CHUNK = 200;
    const insertedEntries: { id: string; dedup_hash: string }[] = [];
    for (let i = 0; i < finalEntries.length; i += CHUNK) {
      const chunk = finalEntries.slice(i, i + CHUNK);
      const { data: ents, error: entErr } = await supabaseAdmin
        .from('policy_entries')
        .insert(chunk.map((c) => c.entry))
        .select('id, dedup_hash');
      if (entErr) return json({ error: 'entry_insert_failed', details: entErr }, 500);
      insertedEntries.push(...(ents ?? []));
    }
    const entryByHash = new Map(insertedEntries.map((e) => [e.dedup_hash, e.id]));
    const newEntries = insertedEntries.length;

    for (const { rowId, entry } of finalEntries) {
      const entryId = entryByHash.get(entry.dedup_hash as string);
      if (!entryId) continue;
      await supabaseAdmin
        .from('policy_import_rows')
        .update({
          match_status: 'new',
          insurance_policy_id: entry.insurance_policy_id,
          policy_entry_id: entryId,
        })
        .eq('id', rowId);
    }

    return json({ reprocessed, new_entries: newEntries, still_unmatched: stillUnmatched, errors });
  } catch (e) {
    console.error('reprocess-unmatched-rows error', e);
    return json({ error: 'internal', message: (e as Error).message }, 500);
  }
});
