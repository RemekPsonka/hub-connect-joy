import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SGU_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'full_name', label: 'Imię i nazwisko', required: true },
  { key: 'phone', label: 'Telefon' },
  { key: 'email', label: 'Email' },
  { key: 'company_name', label: 'Firma' },
  { key: 'nip', label: 'NIP' },
  { key: 'notes', label: 'Notatki' },
];

const SKIP = '__skip__';

function autoSuggest(headers: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const h of headers) {
    const lower = h.toLowerCase();
    if (!m.full_name && /(imię|imie|name|nazwisko|osoba|kontakt)/.test(lower)) m.full_name = h;
    else if (!m.phone && /(tel|phone|kom|gsm)/.test(lower)) m.phone = h;
    else if (!m.email && /(mail|e-mail|email)/.test(lower)) m.email = h;
    else if (!m.company_name && /(firma|company|spółk|spolk)/.test(lower)) m.company_name = h;
    else if (!m.nip && /nip/.test(lower)) m.nip = h;
    else if (!m.notes && /(notat|opis|uwag|note|comment)/.test(lower)) m.notes = h;
  }
  return m;
}

interface Props {
  headers: string[];
  sampleRow?: Record<string, string>;
  mapping: Record<string, string>;
  onMappingChange: (m: Record<string, string>) => void;
}

export function CSVMappingStep({ headers, sampleRow, mapping, onMappingChange }: Props) {
  useEffect(() => {
    if (Object.keys(mapping).length === 0) {
      onMappingChange(autoSuggest(headers));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers]);

  const setField = (sguKey: string, header: string) => {
    const next = { ...mapping };
    if (header === SKIP) delete next[sguKey];
    else next[sguKey] = header;
    onMappingChange(next);
  };

  return (
    <div className="space-y-3">
      {SGU_FIELDS.map((f) => {
        const selected = mapping[f.key] ?? SKIP;
        const sample = sampleRow && mapping[f.key] ? sampleRow[mapping[f.key]] : '';
        return (
          <div key={f.key} className="grid grid-cols-[1fr_2fr_2fr] gap-3 items-center">
            <Label className="text-sm">
              {f.label}
              {f.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select value={selected} onValueChange={(v) => setField(f.key, v)}>
              <SelectTrigger>
                <SelectValue placeholder="— pomiń —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SKIP}>— pomiń —</SelectItem>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground truncate">
              {sample ? `np. ${sample}` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
