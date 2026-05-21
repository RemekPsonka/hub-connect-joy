import { createClient } from 'npm:@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';
import Papa from 'npm:papaparse@5.4.1';
import { verifyAuth, isAuthError, unauthorizedResponse } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const REQUIRED_COLS = [
  'Numer polisy', 'Data wystawienia', 'Data startu', 'Data końca',
  'Składka przypisana', 'Płatność należna', 'Prowizja (%)',
  'Prowizja brutto', 'Prowizja', 'Klient', 'Kod klienta',
  'Towarzystwo Ubezpieczeń', 'Produkt', 'Sprzedawca', 'Osoba wystawiająca polisę',
];

const OPTIONAL_COLS = [
  'Typ sprzedaży', 'Zniżka', 'Pierwsza rata', 'Data anulowania',
  'Typ klienta', 'Grupa Klientów', 'Przedmiot ubezpieczenia',
  'Polisa wystawiona z oferty',
];

const normKey = (s: string) => s.toString().trim().toLowerCase();

function pick(row: Record<string, unknown>, key: string): unknown {
  const want = normKey(key);
  for (const k of Object.keys(row)) {
    if (normKey(k) === want) return row[k];
  }
  return undefined;
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function parseAmount(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  let s = String(v).trim().replace(/\s|\u00a0|PLN|zł/gi, '');
  // PL format: 1.234,56 → 1234.56
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDateValue(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  // DD.MM.YYYY
  const m1 = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  // YYYY-MM-DD
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  // DD/MM/YYYY
  const m3 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m3) return `${m3[3]}-${m3[2]}-${m3[1]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function parseFirstInstallment(raw: unknown): { status: string | null; date: string | null; raw: string | null } {
  const s = asString(raw);
  if (!s) return { status: null, date: null, raw: null };
  const lower = s.toLowerCase();
  let m = lower.match(/^zap[łl]acona\s+(\d{2}\.\d{2}\.\d{4})/);
  if (m) return { status: 'paid', date: parseDateValue(m[1]), raw: s };
  m = lower.match(/^cz[ęe][śs]ciowo\s+zap[łl]acone\s+(\d{2}\.\d{2}\.\d{4})/);
  if (m) return { status: 'partial', date: parseDateValue(m[1]), raw: s };
  if (/^dodany|^dodana/.test(lower)) return { status: 'added', date: null, raw: s };
  return { status: null, date: null, raw: s };
}

async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const buf = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function formatAmount(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function mapPolicyType(product: string): string {
  const p = product.toLowerCase();
  if (p.includes('oc') || p.includes('ac') || p.includes('komunikac')) return 'komunikacyjne';
  if (p.includes('majątk') || p.includes('majatk') || p.includes('mienie')) return 'majątkowe';
  if (p.includes('życie') || p.includes('zycie')) return 'życiowe';
  if (p.includes('zdrow')) return 'zdrowotne';
  return 'inne';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const startTs = Date.now();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const auth = await verifyAuth(req, supabase);
  if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);
  if (auth.userType !== 'director' || !auth.directorId) {
    return json({ error: 'forbidden_not_director' }, 403);
  }

  // Parse multipart
  let file: File | null = null;
  let sourceOverride: string | null = null;
  try {
    const form = await req.formData();
    const f = form.get('file');
    if (f instanceof File) file = f;
    const s = form.get('source');
    if (typeof s === 'string') sourceOverride = s;
  } catch {
    return json({ error: 'invalid_multipart' }, 400);
  }
  if (!file) return json({ error: 'file_required' }, 400);

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const fileHash = await sha256Hex(fileBytes);
  const fileName = file.name || 'upload';
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const source = sourceOverride ?? (ext === 'csv' ? 'csv' : 'excel');

  // Duplicate file check
  const { data: existingBatch } = await supabase
    .from('policy_import_batches')
    .select('id, created_at')
    .eq('tenant_id', auth.tenantId)
    .eq('file_hash', fileHash)
    .maybeSingle();
  if (existingBatch) {
    return json({
      error: 'file_already_imported',
      message: `Ten plik został już zaimportowany dnia ${existingBatch.created_at}`,
      batch_id: existingBatch.id,
    }, 409);
  }

  // Parse rows
  let rows: Record<string, unknown>[] = [];
  let headers: string[] = [];
  try {
    if (source === 'csv') {
      const text = new TextDecoder().decode(fileBytes);
      const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
      rows = parsed.data;
      headers = parsed.meta.fields ?? [];
    } else {
      const wb = XLSX.read(fileBytes, { type: 'array', cellDates: false });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true });
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
      headers = (aoa[0] ?? []).map((h) => asString(h));
    }
  } catch (e) {
    return json({ error: 'parse_failed', details: e instanceof Error ? e.message : String(e) }, 400);
  }

  // Filter out Unnamed: * headers
  const validHeaders = headers.filter((h) => h && !/^unnamed:?\s*\d*$/i.test(h));
  const headerSet = new Set(validHeaders.map((h) => normKey(h)));

  // Check required cols
  const missing = REQUIRED_COLS.filter((c) => !headerSet.has(normKey(c)));
  if (missing.length > 0) {
    // Insert a failed batch
    await supabase.from('policy_import_batches').insert({
      tenant_id: auth.tenantId,
      created_by_user_id: auth.user.id,
      source,
      file_name: fileName,
      file_hash: fileHash,
      file_size_bytes: fileBytes.length,
      total_rows_in_file: rows.length,
      status: 'failed',
      error_message: `missing_required_columns: ${missing.join(', ')}`,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    });
    return json({ error: 'missing_required_columns', missing }, 422);
  }

  const totalInFile = rows.length;

  // Create batch
  const { data: batch, error: batchErr } = await supabase
    .from('policy_import_batches')
    .insert({
      tenant_id: auth.tenantId,
      created_by_user_id: auth.user.id,
      source,
      file_name: fileName,
      file_hash: fileHash,
      file_size_bytes: fileBytes.length,
      total_rows_in_file: totalInFile,
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (batchErr || !batch) {
    return json({ error: 'batch_create_failed', details: batchErr?.message }, 500);
  }
  const batchId = batch.id;

  let rowsNew = 0, rowsDuplicate = 0, rowsUnmatched = 0, rowsParseError = 0;
  const warnings: { row: number; reason: string }[] = [];

  // Local map of external_code → company_id resolved in this batch (avoid re-querying)
  const mappingCache = new Map<string, string>();

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // header is row 1
    const raw = rows[i];
    // Strip Unnamed:* keys from raw_data
    const cleanRaw: Record<string, unknown> = {};
    for (const k of Object.keys(raw)) {
      if (!/^unnamed:?\s*\d*$/i.test(k)) cleanRaw[k] = raw[k];
    }

    const codeRawStr = asString(pick(raw, 'Kod klienta'));
    const externalCode = codeRawStr.replace(/\D/g, '');
    const clientName = asString(pick(raw, 'Klient'));
    const policyNumber = asString(pick(raw, 'Numer polisy'));
    const issueDate = parseDateValue(pick(raw, 'Data wystawienia'));
    const startDate = parseDateValue(pick(raw, 'Data startu'));
    const endDate = parseDateValue(pick(raw, 'Data końca'));
    const premiumAssigned = parseAmount(pick(raw, 'Składka przypisana'));
    const paymentDue = parseAmount(pick(raw, 'Płatność należna'));
    const commissionPct = parseAmount(pick(raw, 'Prowizja (%)'));
    const commissionGross = parseAmount(pick(raw, 'Prowizja brutto'));
    const commissionNet = parseAmount(pick(raw, 'Prowizja'));
    const insurerName = asString(pick(raw, 'Towarzystwo Ubezpieczeń'));
    const productName = asString(pick(raw, 'Produkt'));
    const sellerRaw = asString(pick(raw, 'Sprzedawca'));
    const issuerRaw = asString(pick(raw, 'Osoba wystawiająca polisę'));
    const saleType = asString(pick(raw, 'Typ sprzedaży')) || null;
    const discount = parseAmount(pick(raw, 'Zniżka'));
    const firstInst = parseFirstInstallment(pick(raw, 'Pierwsza rata'));
    const cancelledAt = parseDateValue(pick(raw, 'Data anulowania'));
    const clientType = asString(pick(raw, 'Typ klienta')) || null;
    const clientGroup = asString(pick(raw, 'Grupa Klientów')) || null;
    const subjectText = asString(pick(raw, 'Przedmiot ubezpieczenia')) || null;
    const fromOffer = asString(pick(raw, 'Polisa wystawiona z oferty')) || null;

    // Validate external_code length
    if (![9, 10, 14].includes(externalCode.length)) {
      const reason = `code_invalid_length:${externalCode.length}`;
      await supabase.from('policy_import_rows').insert({
        batch_id: batchId,
        tenant_id: auth.tenantId,
        row_number_in_file: rowNum,
        raw_data: cleanRaw,
        dedup_hash: await sha256Hex(`parse_error|${batchId}|${rowNum}`),
        match_status: 'parse_error',
        external_client_nip: externalCode || null,
        external_client_name: clientName || null,
        notes: reason,
      });
      rowsParseError++;
      warnings.push({ row: rowNum, reason });
      continue;
    }

    if (!policyNumber || !issueDate) {
      const reason = !policyNumber ? 'missing_policy_number' : 'missing_issue_date';
      await supabase.from('policy_import_rows').insert({
        batch_id: batchId,
        tenant_id: auth.tenantId,
        row_number_in_file: rowNum,
        raw_data: cleanRaw,
        dedup_hash: await sha256Hex(`parse_error|${batchId}|${rowNum}`),
        match_status: 'parse_error',
        external_client_nip: externalCode || null,
        external_client_name: clientName || null,
        notes: reason,
      });
      rowsParseError++;
      warnings.push({ row: rowNum, reason });
      continue;
    }

    const nipCandidate = externalCode.length === 10 ? externalCode : null;
    const regonCandidate = (externalCode.length === 9 || externalCode.length === 14) ? externalCode : null;

    const dedupHash = await sha256Hex(
      `${policyNumber.trim()}|${formatAmount(premiumAssigned, 2)}|${issueDate}`,
    );

    // Insert row first (status TBD; use placeholder, update at end)
    const { data: rowIns, error: rowErr } = await supabase
      .from('policy_import_rows')
      .insert({
        batch_id: batchId,
        tenant_id: auth.tenantId,
        row_number_in_file: rowNum,
        raw_data: cleanRaw,
        dedup_hash: dedupHash,
        match_status: 'parse_error', // temp placeholder; updated below
        external_client_nip: externalCode,
        external_client_name: clientName || null,
        notes: 'pending',
      })
      .select('id')
      .single();
    if (rowErr || !rowIns) {
      rowsParseError++;
      warnings.push({ row: rowNum, reason: `row_insert_failed:${rowErr?.message ?? 'unknown'}` });
      continue;
    }
    const importRowId = rowIns.id;

    // Check existing dedup in policy_entries
    const { data: existingEntry } = await supabase
      .from('policy_entries')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .eq('dedup_hash', dedupHash)
      .maybeSingle();
    if (existingEntry) {
      await supabase.from('policy_import_rows').update({
        match_status: 'duplicate_skipped',
        notes: `duplicate_of_entry:${existingEntry.id}`,
      }).eq('id', importRowId);
      rowsDuplicate++;
      continue;
    }

    // Client matching
    let companyId: string | null = mappingCache.get(externalCode) ?? null;
    let matchedBy: string | null = null;

    if (!companyId) {
      const { data: mapping } = await supabase
        .from('import_client_mappings')
        .select('company_id')
        .eq('tenant_id', auth.tenantId)
        .eq('external_source', 'excel')
        .eq('external_code', externalCode)
        .maybeSingle();
      if (mapping) {
        companyId = mapping.company_id;
        matchedBy = 'auto_existing_mapping';
      }
    }

    if (!companyId && nipCandidate) {
      const { data: c } = await supabase
        .from('companies')
        .select('id')
        .eq('tenant_id', auth.tenantId)
        .eq('nip', nipCandidate)
        .maybeSingle();
      if (c) {
        companyId = c.id;
        matchedBy = 'auto_nip';
      }
    }

    if (!companyId && regonCandidate) {
      const { data: c } = await supabase
        .from('companies')
        .select('id')
        .eq('tenant_id', auth.tenantId)
        .eq('regon', regonCandidate)
        .maybeSingle();
      if (c) {
        companyId = c.id;
        matchedBy = 'auto_regon';
      }
    }

    if (!companyId) {
      await supabase.from('policy_import_rows').update({
        match_status: 'unmatched_client',
        notes: `code=${externalCode},name=${clientName}`,
      }).eq('id', importRowId);
      rowsUnmatched++;
      continue;
    }

    // Persist new mapping if it didn't already exist
    if (matchedBy && matchedBy !== 'auto_existing_mapping') {
      await supabase.from('import_client_mappings').insert({
        tenant_id: auth.tenantId,
        external_source: 'excel',
        external_code: externalCode,
        external_name_snapshot: clientName || null,
        company_id: companyId,
        matched_by: matchedBy,
        matched_by_user_id: auth.user.id,
      });
    }
    mappingCache.set(externalCode, companyId);

    // Upsert insurance_policies
    let policyId: string | null = null;
    const { data: existingPolicy } = await supabase
      .from('insurance_policies')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .eq('master_policy_number', policyNumber)
      .maybeSingle();
    if (existingPolicy) {
      policyId = existingPolicy.id;
      await supabase
        .from('insurance_policies')
        .update({ last_imported_at: new Date().toISOString() })
        .eq('id', policyId);
    } else {
      const { data: newPolicy, error: polErr } = await supabase
        .from('insurance_policies')
        .insert({
          tenant_id: auth.tenantId,
          company_id: companyId,
          master_policy_number: policyNumber,
          policy_number: policyNumber,
          policy_name: productName || policyNumber,
          policy_type: mapPolicyType(productName),
          start_date: startDate ?? issueDate,
          end_date: endDate ?? startDate ?? issueDate,
          insurer_name: insurerName || null,
          external_source: source,
          external_client_code: externalCode,
          first_imported_at: new Date().toISOString(),
          last_imported_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (polErr || !newPolicy) {
        await supabase.from('policy_import_rows').update({
          match_status: 'parse_error',
          notes: `policy_insert_failed:${polErr?.message ?? 'unknown'}`,
        }).eq('id', importRowId);
        rowsParseError++;
        warnings.push({ row: rowNum, reason: `policy_insert_failed:${polErr?.message ?? 'unknown'}` });
        continue;
      }
      policyId = newPolicy.id;
    }

    // Insert policy_entry
    const { data: entryIns, error: entryErr } = await supabase
      .from('policy_entries')
      .insert({
        tenant_id: auth.tenantId,
        insurance_policy_id: policyId,
        import_row_id: importRowId,
        issue_date: issueDate,
        start_date: startDate ?? issueDate,
        end_date: endDate ?? startDate ?? issueDate,
        cancelled_at: cancelledAt,
        sale_type: saleType,
        premium_assigned: premiumAssigned,
        discount: discount,
        payment_due: paymentDue,
        commission_pct: commissionPct,
        commission_gross: commissionGross,
        commission_net: commissionNet,
        first_installment_status: firstInst.status,
        first_installment_date: firstInst.date,
        first_installment_raw: firstInst.raw,
        insurer_name: insurerName || null,
        product_name: productName || null,
        subject_text: subjectText,
        client_group: clientGroup,
        client_type: clientType,
        seller_raw: sellerRaw || null,
        issuer_raw: issuerRaw || null,
        from_offer: fromOffer,
        dedup_hash: dedupHash,
      })
      .select('id')
      .single();
    if (entryErr || !entryIns) {
      await supabase.from('policy_import_rows').update({
        match_status: 'parse_error',
        notes: `entry_insert_failed:${entryErr?.message ?? 'unknown'}`,
      }).eq('id', importRowId);
      rowsParseError++;
      warnings.push({ row: rowNum, reason: `entry_insert_failed:${entryErr?.message ?? 'unknown'}` });
      continue;
    }

    await supabase.from('policy_import_rows').update({
      match_status: 'new',
      insurance_policy_id: policyId,
      policy_entry_id: entryIns.id,
      notes: matchedBy ? `matched_by:${matchedBy}` : null,
    }).eq('id', importRowId);
    rowsNew++;
  }

  const totalProcessed = rowsNew + rowsDuplicate + rowsUnmatched + rowsParseError;

  if (totalProcessed !== totalInFile) {
    await supabase.from('policy_import_batches').update({
      status: 'failed',
      error_message: `audit_mismatch: processed=${totalProcessed} expected=${totalInFile}`,
      total_rows_processed: totalProcessed,
      rows_new: rowsNew,
      rows_duplicate: rowsDuplicate,
      rows_unmatched_client: rowsUnmatched,
      rows_parse_error: rowsParseError,
      finished_at: new Date().toISOString(),
    }).eq('id', batchId);
    return json({
      batch_id: batchId,
      status: 'failed',
      error: 'audit_mismatch',
      total_rows_in_file: totalInFile,
      total_rows_processed: totalProcessed,
    }, 500);
  }

  await supabase.from('policy_import_batches').update({
    status: 'completed',
    total_rows_processed: totalProcessed,
    rows_new: rowsNew,
    rows_duplicate: rowsDuplicate,
    rows_unmatched_client: rowsUnmatched,
    rows_parse_error: rowsParseError,
    finished_at: new Date().toISOString(),
  }).eq('id', batchId);

  return json({
    batch_id: batchId,
    status: 'completed',
    file_name: fileName,
    total_rows_in_file: totalInFile,
    rows_new: rowsNew,
    rows_duplicate: rowsDuplicate,
    rows_unmatched_client: rowsUnmatched,
    rows_parse_error: rowsParseError,
    duration_ms: Date.now() - startTs,
    warnings,
  });
});
