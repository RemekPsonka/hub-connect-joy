-- ============================================
-- TEST DATA FOR AI NETWORK ASSISTANT
-- Polish B2B Networking CRM
-- ============================================

DO $$
DECLARE
  v_tenant_id UUID := 'dd293205-6dc1-438e-ad8e-4fd7cdf8f6e5';
  
  -- Contact IDs
  c_jan_kowalski UUID;
  c_anna_nowak UUID;
  c_piotr_wisniewski UUID;
  c_maria_wojcik UUID;
  c_krzysztof_kaminski UUID;
  c_ewa_lewandowska UUID;
  c_tomasz_zielinski UUID;
  c_katarzyna_szymanska UUID;
  c_andrzej_wozniak UUID;
  c_magdalena_dabrowa UUID;
  c_robert_kozlowski UUID;
  c_joanna_jankowska UUID;
  c_marcin_mazur UUID;
  c_agnieszka_krawczyk UUID;
  c_lukasz_piotrowski UUID;
  
BEGIN
  -- ============================================
  -- CONTACTS (15)
  -- ============================================
  
  -- 1. Jan Kowalski - Ubezpieczenia
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Jan Kowalski',
    'Ubezpieczenia Total SA',
    'Dyrektor ds. Klienta Biznesowego',
    'jan.kowalski@total.pl',
    '+48 601 234 567',
    'Katowice',
    'Specjalista od ubezpieczeń majątkowych dla firm. 15 lat doświadczenia w branży. Oferuje kompleksową ochronę dla przedsiębiorstw.',
    'Poszukuje klientów z branży produkcyjnej i transportowej. Ma bardzo dobre stawki dla flot pojazdów.',
    true
  ) RETURNING id INTO c_jan_kowalski;
  
  -- 2. Anna Nowak - Pellet i Biomasa
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Anna Nowak',
    'EcoPellet Sp. z o.o.',
    'Prezes Zarządu',
    'anna.nowak@ecopellet.pl',
    '+48 602 345 678',
    'Bielsko-Biała',
    'Producent pelletu drzewnego i brykietu. Surowiec z tartaków z całego Śląska. Certyfikat ENplus A1. Dostawa własnym transportem.',
    'Szuka hurtowników i dystrybutorów. Może dostarczać 50 ton miesięcznie. Cena konkurencyjna.',
    true
  ) RETURNING id INTO c_anna_nowak;
  
  -- 3. Piotr Wiśniewski - Transport
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Piotr Wiśniewski',
    'TransLog Polska',
    'Kierownik Działu Logistyki',
    'p.wisniewski@translog.pl',
    '+48 603 456 789',
    'Gliwice',
    'Firma transportowa z flotą 25 ciężarówek. Obsługa krajowa i międzynarodowa. Specjalizacja: ładunki drobnicowe i paletowe.',
    'Potrzebuje ubezpieczenia floty. Szuka kontraktów stałych na trasy Polska-Niemcy.',
    true
  ) RETURNING id INTO c_piotr_wisniewski;
  
  -- 4. Maria Wójcik - IT
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Maria Wójcik',
    'CodeFactory',
    'CEO',
    'maria.wojcik@codefactory.pl',
    '+48 604 567 890',
    'Kraków',
    'Software house specjalizujący się w systemach CRM i ERP. Team 15 programistów. React, Node.js, Python.',
    'Szuka projektów dla średnich firm. Może zrobić dedykowany system do zarządzania flotą dla firm transportowych.',
    true
  ) RETURNING id INTO c_maria_wojcik;
  
  -- 5. Krzysztof Kamiński - Tartak
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Krzysztof Kamiński',
    'Tartak Beskidy',
    'Właściciel',
    'k.kaminski@tartakbeskidy.pl',
    '+48 605 678 901',
    'Żywiec',
    'Tartak z 30-letnią tradycją. Produkcja desek, bali, więźby dachowej. Dużo odpadów drzewnych (trociny, zrębki).',
    'Ma mnóstwo odpadów drewnianych do sprzedania. Około 20 ton trocin i zrębków miesięcznie. Teraz sprzedaje bardzo tanio.',
    true
  ) RETURNING id INTO c_krzysztof_kaminski;
  
  -- 6. Ewa Lewandowska - HR
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Ewa Lewandowska',
    'TalentHub',
    'Head of Recruitment',
    'ewa.lewandowska@talenthub.pl',
    '+48 606 789 012',
    'Wrocław',
    'Agencja rekrutacyjna specjalizująca się w IT i inżynierach. Baza 5000+ kandydatów. Headhunting dla managementu.',
    'Poszukuje zleceń na rekrutację programistów i kierowników produkcji. Ma świetnych kandydatów na stanowiska techniczne.',
    true
  ) RETURNING id INTO c_ewa_lewandowska;
  
  -- 7. Tomasz Zieliński - Fotowoltaika
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Tomasz Zieliński',
    'SolarTech Energy',
    'Dyrektor Handlowy',
    'tomasz.zielinski@solartech.pl',
    '+48 607 890 123',
    'Częstochowa',
    'Instalacje fotowoltaiczne dla firm i gospodarstw domowych. Kompleksowa obsługa: projekt, montaż, serwis. Dofinansowania.',
    'Szuka firm które chcą obniżyć koszty energii. Może zainstalować panele na dachach hal produkcyjnych. ROI 4-6 lat.',
    true
  ) RETURNING id INTO c_tomasz_zielinski;
  
  -- 8. Katarzyna Szymańska - Finanse
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Katarzyna Szymańska',
    'FinCorp Leasing',
    'Doradca Finansowy',
    'k.szymanska@fincorp.pl',
    '+48 608 901 234',
    'Katowice',
    'Leasing maszyn, pojazdów, urządzeń. Finansowanie inwestycji dla firm. Factoring. Współpraca z 15 bankami.',
    'Ma bardzo dobre stawki na leasing ciężarówek i maszyn budowlanych. Może sfinansować inwestycje w OZE.',
    true
  ) RETURNING id INTO c_katarzyna_szymanska;
  
  -- 9. Andrzej Woźniak - Catering
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Andrzej Woźniak',
    'Catering Premium',
    'Prezes',
    'andrzej.wozniak@cateringpremium.pl',
    '+48 609 012 345',
    'Sosnowiec',
    'Catering dla firm, eventów, konferencji. Obiady dla pracowników. Minimum 20 osób. Dostawa własnym transportem.',
    'Szuka stałych kontraktów na obiady firmowe. Ma możliwość obsługi firm do 500 osób dziennie.',
    true
  ) RETURNING id INTO c_andrzej_wozniak;
  
  -- 10. Magdalena Dąbrowska - Marketing
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Magdalena Dąbrowska',
    'AdBoost Agency',
    'Marketing Manager',
    'm.dabrowska@adboost.pl',
    '+48 610 123 456',
    'Kraków',
    'Agencja marketingowa: SEO, Google Ads, social media, branding. Specjalizacja: B2B, e-commerce, usługi.',
    'Poszukuje klientów z sektora produkcyjnego i usługowego. Ma case study ze zwiększenia sprzedaży o 300%.',
    true
  ) RETURNING id INTO c_magdalena_dabrowa;
  
  -- 11. Robert Kozłowski - Nieruchomości
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Robert Kozłowski',
    'Industrial Property',
    'Broker',
    'robert.kozlowski@indprop.pl',
    '+48 611 234 567',
    'Katowice',
    'Wynajem i sprzedaż hal magazynowych, produkcyjnych, biur. Portfolio 50+ obiektów na Śląsku.',
    'Ma wolne hale w Katowicach i Gliwicach. Od 500m2 do 5000m2. Może dostosować pod potrzeby najemcy.',
    true
  ) RETURNING id INTO c_robert_kozlowski;
  
  -- 12. Joanna Jankowska - Księgowość
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Joanna Jankowska',
    'BookKeep Pro',
    'Główna Księgowa',
    'j.jankowska@bookkeep.pl',
    '+48 612 345 678',
    'Tychy',
    'Biuro rachunkowe obsługujące 150+ firm. Pełna księgowość, kadry, ZUS, deklaracje. Obsługa online.',
    'Szuka nowych klientów - małe i średnie firmy. Cena od 300 zł/mc. Specjalizacja: produkcja, handel.',
    true
  ) RETURNING id INTO c_joanna_jankowska;
  
  -- 13. Marcin Mazur - Prawnik
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Marcin Mazur',
    'Kancelaria Mazur i Wspólnicy',
    'Radca Prawny',
    'marcin.mazur@kancelaria-mazur.pl',
    '+48 613 456 789',
    'Katowice',
    'Prawo gospodarcze, umowy handlowe, windykacja, obsługa prawna firm. 20 lat praktyki.',
    'Specjalizuje się w prawie transportowym i budowlanym. Może pomóc w odzyskaniu należności.',
    true
  ) RETURNING id INTO c_marcin_mazur;
  
  -- 14. Agnieszka Krawczyk - Szkolenia BHP
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Agnieszka Krawczyk',
    'SafeWork Training',
    'Trener BHP',
    'a.krawczyk@safework.pl',
    '+48 614 567 890',
    'Rybnik',
    'Szkolenia BHP, ppoż, pierwsza pomoc. Certyfikowane kursy dla pracowników i kadry zarządzającej.',
    'Prowadzi szkolenia wyjazdowe w firmach. Cena grupowa od 50 zł/osoba. Ma terminy każdego tygodnia.',
    true
  ) RETURNING id INTO c_agnieszka_krawczyk;
  
  -- 15. Łukasz Piotrowski - Maszyny budowlane
  INSERT INTO contacts (tenant_id, full_name, company, position, email, phone, city, profile_summary, notes, is_active)
  VALUES (
    v_tenant_id,
    'Łukasz Piotrowski',
    'BudMach Rental',
    'Właściciel',
    'lukasz.piotrowski@budmach.pl',
    '+48 615 678 901',
    'Zabrze',
    'Wynajem koparek, ładowarek, wózków widłowych, podnośników. Krótko i długoterminowy. Serwis 24/7.',
    'Ma dostępne maszyny od zaraz. Konkurencyjne ceny. Może dostarczyć na plac budowy w promieniu 100km.',
    true
  ) RETURNING id INTO c_lukasz_piotrowski;
  
  -- ============================================
  -- NEEDS (8)
  -- ============================================
  
  -- Need 1: Piotr (Transport) potrzebuje ubezpieczenia
  INSERT INTO needs (tenant_id, contact_id, title, description, priority, status)
  VALUES (
    v_tenant_id,
    c_piotr_wisniewski,
    'Ubezpieczenie floty 25 ciężarówek',
    'Potrzebuję kompleksowego ubezpieczenia AC + OC dla floty 25 ciężarówek. Aktualnie płacę około 180 tys zł rocznie. Szukam lepszej oferty. Pojazdy: MAN, Scania, Volvo, rocznik 2018-2022.',
    'high',
    'active'
  );
  
  -- Need 2: Anna (Pellet) potrzebuje surowców
  INSERT INTO needs (tenant_id, contact_id, title, description, priority, status)
  VALUES (
    v_tenant_id,
    c_anna_nowak,
    'Poszukuję dostawcy trocin i zrębków',
    'Potrzebuję 30-40 ton trocin i zrębków drzewnych miesięcznie do produkcji pelletu. Surowiec musi być suchy (wilgotność max 15%). Najlepiej z Śląska - niskie koszty transportu.',
    'high',
    'active'
  );
  
  -- Need 3: Piotr (Transport) potrzebuje systemu
  INSERT INTO needs (tenant_id, contact_id, title, description, priority, status)
  VALUES (
    v_tenant_id,
    c_piotr_wisniewski,
    'System do zarządzania flotą',
    'Szukam oprogramowania do zarządzania flotą transportową. Potrzebne funkcje: GPS, planowanie tras, rozliczenia kierowców, kontrola kosztów paliwa, serwis pojazdów.',
    'medium',
    'active'
  );
  
  -- Need 4: Krzysztof (Tartak) potrzebuje leasingu
  INSERT INTO needs (tenant_id, contact_id, title, description, priority, status)
  VALUES (
    v_tenant_id,
    c_krzysztof_kaminski,
    'Leasing pilarki taśmowej',
    'Planuję kupić nową pilarkę taśmową za około 250 tys zł. Szukam korzystnego leasingu operacyjnego. Chciałbym niską ratę początkową.',
    'medium',
    'active'
  );
  
  -- Need 5: Tomasz (Fotowoltaika) potrzebuje marketingu
  INSERT INTO needs (tenant_id, contact_id, title, description, priority, status)
  VALUES (
    v_tenant_id,
    c_tomasz_zielinski,
    'Marketing i pozyskiwanie klientów B2B',
    'Szukam agencji marketingowej która pomoże pozyskać klientów biznesowych zainteresowanych fotowoltaiką. Budżet około 5000 zł/mc. Zależy mi na Google Ads i LinkedIn.',
    'high',
    'active'
  );
  
  -- Need 6: Robert (Nieruchomości) potrzebuje najemcy
  INSERT INTO needs (tenant_id, contact_id, title, description, priority, status)
  VALUES (
    v_tenant_id,
    c_robert_kozlowski,
    'Poszukuję najemcy na halę 2000m2 w Katowicach',
    'Mam wolną halę magazynowo-produkcyjną 2000m2 w Katowicach, dzielnica Muchowiec. Wysokość 8m, brama TIR, parking dla 20 aut. Czynsz 18 zł/m2. Szukam solidnego najemcy na min 3 lata.',
    'medium',
    'active'
  );
  
  -- Need 7: Andrzej (Catering) potrzebuje kontraktu
  INSERT INTO needs (tenant_id, contact_id, title, description, priority, status)
  VALUES (
    v_tenant_id,
    c_andrzej_wozniak,
    'Kontrakty na catering dla firm produkcyjnych',
    'Szukam firm produkcyjnych które potrzebują codziennych obiadów dla pracowników. Mogę obsłużyć do 500 osób dziennie. Mam referencje z 12 firm. Cena od 18 zł/obiad.',
    'high',
    'active'
  );
  
  -- Need 8: Ewa (HR) potrzebuje zleceń
  INSERT INTO needs (tenant_id, contact_id, title, description, priority, status)
  VALUES (
    v_tenant_id,
    c_ewa_lewandowska,
    'Zlecenia na rekrutację inżynierów i programistów',
    'Specjalizujemy się w rekrutacji IT i technicznej. Mamy bazę kandydatów. Szukam firm które potrzebują: programistów (Java, Python, React), kierowników produkcji, inżynierów mechaników.',
    'medium',
    'active'
  );
  
  -- ============================================
  -- OFFERS (10)
  -- ============================================
  
  -- Offer 1: Jan (Ubezpieczenia) oferuje polisy
  INSERT INTO offers (tenant_id, contact_id, title, description, status)
  VALUES (
    v_tenant_id,
    c_jan_kowalski,
    'Ubezpieczenie flot pojazdów - rabat 20%',
    'Oferuję kompleksowe ubezpieczenie AC+OC dla flot pojazdów ciężarowych. Specjalna promocja: 20% rabatu dla flot powyżej 20 pojazdów. Możliwość assistance 24/7, auto zastępcze, wypłata bez badania alkotestu kierowcy.',
    'active'
  );
  
  -- Offer 2: Krzysztof (Tartak) oferuje odpady
  INSERT INTO offers (tenant_id, contact_id, title, description, status)
  VALUES (
    v_tenant_id,
    c_krzysztof_kaminski,
    'Sprzedaż trocin i zrębków drzewnych - 20 ton/mc',
    'Sprzedaję odpady drzewne z tartaku: trociny i zrębki. Około 20 ton miesięcznie. Drewno sosnowe i świerkowe, suche (wilgotność 12-15%). Idealne do pelletu lub brykietu. Cena 80 zł/tona + transport.',
    'active'
  );
  
  -- Offer 3: Maria (IT) oferuje systemy
  INSERT INTO offers (tenant_id, contact_id, title, description, status)
  VALUES (
    v_tenant_id,
    c_maria_wojcik,
    'Dedykowane systemy do zarządzania flotą',
    'Tworzymy dedykowane oprogramowanie do zarządzania flotą pojazdów. Funkcje: GPS real-time, planowanie tras, rozliczenia kierowców, kontrola paliwa, harmonogramy serwisów, integracja z e-TOLL. Wdrożenie 2-3 miesiące. Cena od 50 tys zł.',
    'active'
  );
  
  -- Offer 4: Katarzyna (Finanse) oferuje leasing
  INSERT INTO offers (tenant_id, contact_id, title, description, status)
  VALUES (
    v_tenant_id,
    c_katarzyna_szymanska,
    'Leasing maszyn i urządzeń - wkład 0%',
    'Finansowanie maszyn, pojazdów, urządzeń produkcyjnych. Leasing operacyjny i finansowy. Możliwość 0% wkładu własnego. Okres 24-84 miesiące. Decyzja w 24h. Współpracujemy z 15 bankami - znajdziemy najlepszą ofertę.',
    'active'
  );
  
  -- Offer 5: Magdalena (Marketing) oferuje kampanie
  INSERT INTO offers (tenant_id, contact_id, title, description, status)
  VALUES (
    v_tenant_id,
    c_magdalena_dabrowa,
    'Kampanie Google Ads i LinkedIn dla B2B',
    'Specjalizujemy się w marketingu B2B. Tworzymy skuteczne kampanie Google Ads i LinkedIn Ads dla firm sprzedających usługi i produkty biznesowe. Case study: klient z branży OZE - wzrost leadów o 320% w 6 miesięcy. Audyt gratis.',
    'active'
  );
  
  -- Offer 6: Robert (Nieruchomości) oferuje hale
  INSERT INTO offers (tenant_id, contact_id, title, description, status)
  VALUES (
    v_tenant_id,
    c_robert_kozlowski,
    'Hale magazynowe i produkcyjne na Śląsku',
    'Wynajem hal magazynowych i produkcyjnych: od 500m2 do 5000m2. Lokalizacje: Katowice, Gliwice, Tychy. Wysokość 6-10m, bramy TIR, możliwość adaptacji, parking, ochrona. Czynsz od 15 zł/m2 + media.',
    'active'
  );
  
  -- Offer 7: Ewa (HR) oferuje rekrutację
  INSERT INTO offers (tenant_id, contact_id, title, description, status)
  VALUES (
    v_tenant_id,
    c_ewa_lewandowska,
    'Rekrutacja IT i inżynierów - baza 5000+ kandydatów',
    'Agencja rekrutacyjna specjalizująca się w IT i stanowiskach technicznych. Baza 5000+ aktywnych kandydatów: programiści (Java, Python, React, .NET), kierownicy produkcji, inżynierowie (mechanicy, elektrycy, budowlańcy). Success fee - płacisz tylko za zatrudnienie.',
    'active'
  );
  
  -- Offer 8: Joanna (Księgowość) oferuje usługi
  INSERT INTO offers (tenant_id, contact_id, title, description, status)
  VALUES (
    v_tenant_id,
    c_joanna_jankowska,
    'Pełna księgowość dla firm produkcyjnych i handlowych',
    'Biuro rachunkowe z 15-letnim doświadczeniem. Pełna księgowość, kadry, płace, ZUS, VAT. Specjalizacja: produkcja, handel, transport. Obsługa online przez dedykowany system. Stały opiekun. Cena od 300 zł/mc dla małych firm, od 800 zł/mc dla średnich.',
    'active'
  );
  
  -- Offer 9: Tomasz (Fotowoltaika) oferuje instalacje
  INSERT INTO offers (tenant_id, contact_id, title, description, status)
  VALUES (
    v_tenant_id,
    c_tomasz_zielinski,
    'Instalacje fotowoltaiczne dla firm - obniż rachunek o 80%',
    'Projektowanie i montaż instalacji fotowoltaicznych dla firm. Panele na dachach hal produkcyjnych, magazynowych. Moc od 50kW do 1MW. Dofinansowania do 50%. ROI 4-6 lat. Serwis i gwarancja 25 lat. Finansowanie leasingowe.',
    'active'
  );
  
  -- Offer 10: Andrzej (Catering) oferuje obiady
  INSERT INTO offers (tenant_id, contact_id, title, description, status)
  VALUES (
    v_tenant_id,
    c_andrzej_wozniak,
    'Catering firmowy - obiady dla pracowników od 18zł',
    'Codzienne obiady dla pracowników firm. Menu 3-daniowe zmieniane co tydzień. Dostawa własnym transportem, termoporty, zawieszenie zbiorowe. Minimum 20 osób. Możliwość diet specjalnych (wegetariańska, bezglutenowa). Cena od 18 zł/obiad.',
    'active'
  );
  
  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'Contacts: 15';
  RAISE NOTICE 'Needs: 8';
  RAISE NOTICE 'Offers: 10';
  
END $$;