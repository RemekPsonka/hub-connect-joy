// DNA Operacyjne - charakter działalności
export type TypDzialnosci = 'produkcja' | 'uslugi' | 'handel' | 'import_export' | 'ecommerce';

// Status ubezpieczenia (sygnalizacja świetlna)
export type StatusUbezpieczenia = 'ubezpieczone' | 'luka' | 'nie_dotyczy';

// Etykiety dla typów działalności
export const TYPY_DZIALALNOSCI_LABELS: Record<TypDzialnosci, string> = {
  produkcja: 'Produkcja',
  uslugi: 'Usługi',
  handel: 'Handel',
  import_export: 'Import/Eksport',
  ecommerce: 'e-Commerce',
};

// Etykiety dla statusów
export const STATUS_LABELS: Record<StatusUbezpieczenia, string> = {
  ubezpieczone: 'Ubezpieczone',
  luka: 'LUKA',
  nie_dotyczy: 'N/D',
};

// Domeny ryzyka
export interface RyzykoMajatkowe {
  status: StatusUbezpieczenia;
  liczba_lokalizacji?: number;
  typ_wlasnosci?: 'wlasnosc' | 'najem' | 'mieszane';
  suma_ubezp_majatek?: number;
  suma_ubezp_bi?: number;
  materialy_latwopalne?: boolean;
  awaria_maszyn?: boolean;
  uwagi?: string;
}

export interface RyzykoOC {
  status: StatusUbezpieczenia;
  oc_produktowe?: boolean;
  oc_zawodowe?: boolean;
  zakres_terytorialny?: string[];
  jurysdykcja_usa?: boolean;
  obroty_usa_procent?: number;
  uwagi?: string;
}

export interface RyzykoFlota {
  status: StatusUbezpieczenia;
  liczba_pojazdow?: number;
  cargo_ubezpieczone?: boolean;
  cpm_ubezpieczone?: boolean;
  wartosc_floty?: number;
  uwagi?: string;
}

export interface RyzykoSpecjalistyczne {
  cyber_status: StatusUbezpieczenia;
  cyber_suma?: number;
  do_status: StatusUbezpieczenia;
  do_suma?: number;
  car_ear_status: StatusUbezpieczenia;
  car_ear_projekty?: string;
  uwagi?: string;
}

export interface RyzykoPracownicy {
  zycie_status: StatusUbezpieczenia;
  zycie_liczba_pracownikow?: number;
  zdrowie_status: StatusUbezpieczenia;
  zdrowie_typ_pakietu?: string;
  podroze_status: StatusUbezpieczenia;
  uwagi?: string;
}

// Podpowiedź AI
export interface PodpowiedzAI {
  id: string;
  wyzwalacz: string;
  wiadomosc: string;
  priorytet: 'krytyczny' | 'ostrzezenie' | 'info';
  domena: string;
}

// Główna struktura analizy
export interface AnalizaRyzykaUbezpieczeniowego {
  id: string;
  company_id: string;
  tenant_id: string;
  
  // DNA Operacyjne
  typy_dzialalnosci: TypDzialnosci[];
  ryzyka_specyficzne_branzowe?: string[];
  
  // Domeny ryzyka
  ryzyko_majatkowe: RyzykoMajatkowe;
  ryzyko_oc: RyzykoOC;
  ryzyko_flota: RyzykoFlota;
  ryzyko_specjalistyczne: RyzykoSpecjalistyczne;
  ryzyko_pracownicy: RyzykoPracownicy;
  
  // Wygenerowane przez AI
  ai_analiza_kontekstu?: string;
  ai_podpowiedzi?: PodpowiedzAI[];
  ai_brief_brokerski?: string;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Domyślne wartości dla nowej analizy
export const DEFAULT_RYZYKO_MAJATKOWE: RyzykoMajatkowe = {
  status: 'nie_dotyczy',
};

export const DEFAULT_RYZYKO_OC: RyzykoOC = {
  status: 'nie_dotyczy',
};

export const DEFAULT_RYZYKO_FLOTA: RyzykoFlota = {
  status: 'nie_dotyczy',
};

export const DEFAULT_RYZYKO_SPECJALISTYCZNE: RyzykoSpecjalistyczne = {
  cyber_status: 'nie_dotyczy',
  do_status: 'nie_dotyczy',
  car_ear_status: 'nie_dotyczy',
};

export const DEFAULT_RYZYKO_PRACOWNICY: RyzykoPracownicy = {
  zycie_status: 'nie_dotyczy',
  zdrowie_status: 'nie_dotyczy',
  podroze_status: 'nie_dotyczy',
};

// Props dla komponentów domen
export interface DomainProps<T> {
  data: T;
  onChange: (data: T) => void;
  operationalTypes: TypDzialnosci[];
}
