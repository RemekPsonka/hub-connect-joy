/**
 * SGU "firma-first" display helper.
 * Heading = company name. Subtext = person.
 *
 * Resolution order for company:
 *   1. joined `companies.name` (via `contacts.company_id`)
 *   2. legacy text `contacts.company`
 *   3. fallback to person's full name when no company at all
 */

export interface FirmFirstInput {
  companyName?: string | null;
  companyTextLegacy?: string | null;
  fullName?: string | null;
}

export interface FirmFirstDisplay {
  /** Main heading — company name when available, otherwise person. */
  heading: string;
  /** Subtext — person name when heading is a company, otherwise empty. */
  subtext: string | null;
  /** True when heading is the company name (not the person fallback). */
  hasCompany: boolean;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isPlaceholderPersonName(value: string): boolean {
  return /^bez nazwy$/i.test(value.trim());
}

export function getSguDisplayName(input: FirmFirstInput): FirmFirstDisplay {
  const company = (input.companyName?.trim() || input.companyTextLegacy?.trim()) ?? '';
  const person = input.fullName?.trim() ?? '';

  if (company) {
    const personIsReal =
      person.length > 0 &&
      !isPlaceholderPersonName(person) &&
      normalizeName(person) !== normalizeName(company);

    return {
      heading: company,
      subtext: personIsReal ? person : null,
      hasCompany: true,
    };
  }

  return {
    heading: person || 'Bez nazwy',
    subtext: null,
    hasCompany: false,
  };
}
