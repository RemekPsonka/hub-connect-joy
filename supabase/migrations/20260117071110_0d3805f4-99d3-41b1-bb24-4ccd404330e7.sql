-- Rozbudowany słownik synonimów - poziom PWN
-- ============================================

-- Czyszczenie istniejących danych przed wstawieniem nowych
DELETE FROM public.search_synonyms;

-- ============================================
-- BRANŻE I SEKTORY GOSPODARKI
-- ============================================

INSERT INTO public.search_synonyms (term, synonyms, category) VALUES
  -- Ubezpieczenia i Finanse
  ('ubezpieczenie', ARRAY['ochrona', 'polisa', 'asekuracja', 'zabezpieczenie', 'insurance', 'gwarancja', 'reasekuracja', 'underwriting'], 'branża'),
  ('ochrona', ARRAY['ubezpieczenie', 'polisa', 'asekuracja', 'bezpieczeństwo', 'zabezpieczenie', 'obrona', 'protekcja'], 'branża'),
  ('polisa', ARRAY['ubezpieczenie', 'ochrona', 'asekuracja', 'umowa ubezpieczeniowa', 'kontrakt'], 'branża'),
  ('finanse', ARRAY['kredyt', 'pożyczka', 'inwestycje', 'bankowość', 'leasing', 'factoring', 'kapitał', 'pieniądze', 'środki', 'fundusze'], 'branża'),
  ('kredyt', ARRAY['pożyczka', 'finansowanie', 'finanse', 'leasing', 'rata', 'hipoteka', 'loan', 'debet'], 'branża'),
  ('pożyczka', ARRAY['kredyt', 'finansowanie', 'loan', 'dług', 'zobowiązanie'], 'branża'),
  ('inwestycje', ARRAY['finanse', 'kapitał', 'funding', 'finansowanie', 'lokaty', 'akcje', 'obligacje', 'fundusze', 'venture', 'private equity'], 'branża'),
  ('bank', ARRAY['bankowość', 'finanse', 'kredyt', 'konto', 'rachunek', 'instytucja finansowa'], 'branża'),
  ('bankowość', ARRAY['bank', 'finanse', 'kredyty', 'konta', 'rachunki', 'banking'], 'branża'),
  ('leasing', ARRAY['wynajem', 'kredyt', 'finansowanie', 'dzierżawa', 'najem'], 'branża'),
  ('factoring', ARRAY['finanse', 'windykacja', 'należności', 'faktury', 'płatności'], 'branża'),
  ('windykacja', ARRAY['odzyskiwanie długów', 'factoring', 'należności', 'egzekucja', 'inkaso'], 'branża'),
  ('księgowość', ARRAY['rachunkowość', 'finanse', 'accounting', 'bilans', 'podatki', 'rozliczenia', 'biuro rachunkowe'], 'branża'),
  ('rachunkowość', ARRAY['księgowość', 'accounting', 'bilans', 'finanse', 'sprawozdawczość'], 'branża'),
  ('podatki', ARRAY['tax', 'fiskalne', 'skarbowe', 'pit', 'vat', 'cit', 'rozliczenia', 'deklaracje'], 'branża'),
  ('audyt', ARRAY['kontrola', 'weryfikacja', 'audit', 'przegląd', 'rewizja', 'badanie', 'inspekcja'], 'branża'),
  
  -- HR i Rekrutacja
  ('praca', ARRAY['zatrudnienie', 'rekrutacja', 'hr', 'kariera', 'headhunting', 'stanowisko', 'etat', 'job', 'posada', 'employment'], 'branża'),
  ('rekrutacja', ARRAY['hr', 'zatrudnienie', 'headhunting', 'praca', 'nabór', 'selekcja', 'hiring', 'talent acquisition'], 'branża'),
  ('hr', ARRAY['rekrutacja', 'kadry', 'praca', 'zatrudnienie', 'human resources', 'zasoby ludzkie', 'personel', 'pracownicy'], 'branża'),
  ('kadry', ARRAY['hr', 'personel', 'pracownicy', 'zasoby ludzkie', 'zatrudnienie'], 'branża'),
  ('headhunting', ARRAY['rekrutacja', 'executive search', 'pozyskiwanie talentów', 'łowcy głów'], 'branża'),
  ('szkolenia', ARRAY['training', 'kursy', 'edukacja', 'warsztaty', 'rozwój', 'coaching', 'mentoring', 'nauka', 'kształcenie'], 'branża'),
  ('coaching', ARRAY['szkolenia', 'mentoring', 'rozwój osobisty', 'trening', 'doradztwo'], 'branża'),
  ('mentoring', ARRAY['coaching', 'szkolenia', 'rozwój', 'doradztwo', 'prowadzenie'], 'branża'),
  
  -- Marketing i Reklama
  ('marketing', ARRAY['reklama', 'promocja', 'branding', 'pr', 'social media', 'advertising', 'kampanie', 'komunikacja', 'sprzedaż'], 'branża'),
  ('reklama', ARRAY['marketing', 'promocja', 'advertising', 'kampanie', 'media', 'kreacja', 'ogłoszenia'], 'branża'),
  ('pr', ARRAY['public relations', 'marketing', 'komunikacja', 'media', 'wizerunek', 'reputacja'], 'branża'),
  ('branding', ARRAY['marka', 'identyfikacja wizualna', 'logo', 'wizerunek', 'brand', 'tożsamość'], 'branża'),
  ('social media', ARRAY['media społecznościowe', 'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'sm', 'socialmedia'], 'branża'),
  ('seo', ARRAY['pozycjonowanie', 'optymalizacja', 'google', 'wyszukiwarki', 'sem', 'marketing internetowy'], 'branża'),
  ('sem', ARRAY['google ads', 'reklama internetowa', 'ppc', 'adwords', 'kampanie płatne'], 'branża'),
  ('content', ARRAY['treści', 'copywriting', 'artykuły', 'teksty', 'materiały', 'content marketing'], 'branża'),
  ('copywriting', ARRAY['pisanie', 'teksty', 'content', 'reklama', 'treści reklamowe'], 'branża'),
  ('grafika', ARRAY['design', 'projektowanie', 'wizualizacja', 'kreacja', 'graphics', 'dtp'], 'branża'),
  ('design', ARRAY['projektowanie', 'grafika', 'ux', 'ui', 'wzornictwo', 'kreacja'], 'branża'),
  ('ux', ARRAY['user experience', 'design', 'ui', 'projektowanie', 'użyteczność', 'interfejs'], 'branża'),
  ('ui', ARRAY['user interface', 'design', 'ux', 'interfejs', 'grafika'], 'branża'),
  
  -- IT i Technologia
  ('it', ARRAY['technologia', 'informatyka', 'programowanie', 'software', 'systemy', 'tech', 'komputery', 'digital'], 'branża'),
  ('programowanie', ARRAY['it', 'software', 'development', 'coding', 'dev', 'kodowanie', 'aplikacje', 'programista'], 'branża'),
  ('software', ARRAY['oprogramowanie', 'aplikacje', 'systemy', 'it', 'programy', 'soft'], 'branża'),
  ('hardware', ARRAY['sprzęt', 'komputery', 'urządzenia', 'elektronika', 'serwery'], 'branża'),
  ('web', ARRAY['strony internetowe', 'www', 'internet', 'witryny', 'portale', 'serwisy'], 'branża'),
  ('aplikacje', ARRAY['apps', 'programy', 'software', 'mobile', 'oprogramowanie'], 'branża'),
  ('mobile', ARRAY['aplikacje mobilne', 'android', 'ios', 'smartphone', 'telefon'], 'branża'),
  ('cloud', ARRAY['chmura', 'aws', 'azure', 'google cloud', 'hosting', 'saas', 'iaas', 'paas'], 'branża'),
  ('cyberbezpieczeństwo', ARRAY['security', 'bezpieczeństwo it', 'ochrona danych', 'hacking', 'firewall', 'antywirus'], 'branża'),
  ('ai', ARRAY['sztuczna inteligencja', 'machine learning', 'ml', 'deep learning', 'neural networks', 'automatyzacja'], 'branża'),
  ('automatyzacja', ARRAY['robotyzacja', 'rpa', 'ai', 'procesy', 'optymalizacja', 'boty'], 'branża'),
  ('data', ARRAY['dane', 'analytics', 'big data', 'analiza danych', 'raportowanie', 'business intelligence', 'bi'], 'branża'),
  ('erp', ARRAY['sap', 'system', 'zarządzanie', 'planowanie zasobów', 'crm', 'oprogramowanie biznesowe'], 'branża'),
  ('crm', ARRAY['zarządzanie klientami', 'salesforce', 'hubspot', 'relacje z klientami', 'sprzedaż'], 'branża'),
  
  -- Budownictwo i Nieruchomości
  ('nieruchomości', ARRAY['real estate', 'deweloper', 'mieszkania', 'biura', 'budynki', 'lokale', 'grunty', 'działki'], 'branża'),
  ('budowa', ARRAY['budownictwo', 'konstrukcja', 'wykonawstwo', 'budynek', 'inwestycja', 'realizacja'], 'branża'),
  ('budownictwo', ARRAY['budowa', 'konstrukcje', 'wykonawstwo', 'inżynieria', 'generalny wykonawca'], 'branża'),
  ('deweloper', ARRAY['developer', 'inwestor', 'budowa mieszkań', 'nieruchomości', 'osiedla'], 'branża'),
  ('architektura', ARRAY['projektowanie', 'architekci', 'projekty budowlane', 'design', 'urbanistyka'], 'branża'),
  ('instalacje', ARRAY['elektryka', 'hydraulika', 'wentylacja', 'klimatyzacja', 'ogrzewanie', 'hvac'], 'branża'),
  ('wykończenia', ARRAY['remonty', 'wnętrza', 'aranżacja', 'fit-out', 'adaptacja'], 'branża'),
  ('remonty', ARRAY['wykończenia', 'modernizacja', 'odnowa', 'przebudowa', 'rewitalizacja'], 'branża'),
  
  -- Transport i Logistyka
  ('transport', ARRAY['logistyka', 'spedycja', 'przewóz', 'shipping', 'dostawa', 'fracht', 'przewozy', 'tir'], 'branża'),
  ('logistyka', ARRAY['transport', 'spedycja', 'magazynowanie', 'supply chain', 'łańcuch dostaw', 'dystrybucja'], 'branża'),
  ('spedycja', ARRAY['transport', 'logistyka', 'przewóz', 'fracht', 'shipping', 'forwarding'], 'branża'),
  ('magazynowanie', ARRAY['logistyka', 'storage', 'przechowywanie', 'magazyn', 'fulfillment'], 'branża'),
  ('kurier', ARRAY['dostawa', 'przesyłki', 'paczki', 'express', 'kurierzy'], 'branża'),
  ('flota', ARRAY['samochody', 'pojazdy', 'auta firmowe', 'car fleet', 'leasing aut'], 'branża'),
  
  -- Energia i Ekologia
  ('energia', ARRAY['oze', 'fotowoltaika', 'energia odnawialna', 'solar', 'prąd', 'elektrownia', 'power'], 'branża'),
  ('fotowoltaika', ARRAY['panele słoneczne', 'pv', 'solar', 'energia słoneczna', 'oze', 'instalacje pv'], 'branża'),
  ('oze', ARRAY['energia odnawialna', 'fotowoltaika', 'wiatr', 'biomasa', 'renewable', 'green energy'], 'branża'),
  ('pellet', ARRAY['biomasa', 'odpady drewniane', 'paliwo', 'opał', 'trociny', 'zrębki', 'brykiet'], 'branża'),
  ('biomasa', ARRAY['pellet', 'odpady drewniane', 'energia odnawialna', 'paliwo', 'biogaz'], 'branża'),
  ('ekologia', ARRAY['środowisko', 'ochrona środowiska', 'sustainability', 'zrównoważony rozwój', 'green', 'eco'], 'branża'),
  ('odpady', ARRAY['śmieci', 'recykling', 'utylizacja', 'gospodarka odpadami', 'waste'], 'branża'),
  ('recykling', ARRAY['odpady', 'przetwarzanie', 'surowce wtórne', 'segregacja', 'recycling'], 'branża'),
  ('woda', ARRAY['wodociągi', 'kanalizacja', 'oczyszczalnia', 'uzdatnianie', 'hydro'], 'branża'),
  
  -- Produkcja i Przemysł
  ('produkcja', ARRAY['wytwarzanie', 'manufacturing', 'fabryka', 'przemysł', 'zakład', 'linia produkcyjna'], 'branża'),
  ('przemysł', ARRAY['produkcja', 'industry', 'fabryka', 'manufacturing', 'zakłady'], 'branża'),
  ('fabryka', ARRAY['zakład', 'produkcja', 'manufacturing', 'wytwórnia', 'hala'], 'branża'),
  ('maszyny', ARRAY['urządzenia', 'sprzęt', 'equipment', 'machinery', 'obrabiarki'], 'branża'),
  ('automatyka', ARRAY['automatyzacja', 'robotyka', 'sterowanie', 'plc', 'przemysł 4.0'], 'branża'),
  ('spawanie', ARRAY['spawalnictwo', 'welding', 'łączenie metali', 'konstrukcje stalowe'], 'branża'),
  ('obróbka', ARRAY['cnc', 'toczenie', 'frezowanie', 'metal', 'obróbka skrawaniem'], 'branża'),
  ('pakowanie', ARRAY['opakowania', 'packaging', 'konfekcjonowanie', 'etykietowanie'], 'branża'),
  
  -- Medycyna i Zdrowie
  ('zdrowie', ARRAY['medycyna', 'opieka zdrowotna', 'healthcare', 'wellness', 'leczenie', 'terapia'], 'branża'),
  ('medycyna', ARRAY['zdrowie', 'lekarz', 'healthcare', 'opieka zdrowotna', 'szpital', 'klinika'], 'branża'),
  ('szpital', ARRAY['klinika', 'przychodnia', 'medycyna', 'lecznica', 'hospital'], 'branża'),
  ('farmacja', ARRAY['apteka', 'leki', 'pharmaceutical', 'farmaceutyka', 'suplementy'], 'branża'),
  ('stomatologia', ARRAY['dentysta', 'zęby', 'dental', 'ortodoncja', 'implantologia'], 'branża'),
  ('fizjoterapia', ARRAY['rehabilitacja', 'masaż', 'terapia', 'leczenie ruchem', 'physiotherapy'], 'branża'),
  ('psychologia', ARRAY['terapia', 'psychoterapia', 'coaching', 'zdrowie psychiczne', 'counseling'], 'branża'),
  ('kosmetyka', ARRAY['beauty', 'uroda', 'pielęgnacja', 'spa', 'wellness', 'zabiegi'], 'branża'),
  
  -- Prawo i Doradztwo
  ('prawo', ARRAY['prawnik', 'adwokat', 'radca prawny', 'kancelaria', 'legal', 'law', 'obsługa prawna'], 'branża'),
  ('adwokat', ARRAY['prawnik', 'radca prawny', 'kancelaria', 'obrońca', 'pełnomocnik'], 'branża'),
  ('notariusz', ARRAY['akt notarialny', 'kancelaria notarialna', 'umowy', 'poświadczenia'], 'branża'),
  ('konsulting', ARRAY['doradztwo', 'consulting', 'advisory', 'doradzanie', 'strategia'], 'branża'),
  ('doradztwo', ARRAY['konsulting', 'consulting', 'poradnictwo', 'ekspertyza', 'advisory'], 'branża'),
  ('patenty', ARRAY['własność intelektualna', 'znaki towarowe', 'ip', 'wynalazki', 'prawa autorskie'], 'branża'),
  
  -- Handel i Sprzedaż
  ('handel', ARRAY['sprzedaż', 'dystrybucja', 'trade', 'zakupy', 'retail', 'hurtownia'], 'branża'),
  ('sprzedaż', ARRAY['handel', 'sales', 'dystrybucja', 'komercja', 'obrót'], 'branża'),
  ('retail', ARRAY['handel detaliczny', 'sklepy', 'detal', 'sprzedaż detaliczna'], 'branża'),
  ('hurt', ARRAY['hurtownia', 'wholesale', 'dystrybucja', 'handel hurtowy'], 'branża'),
  ('ecommerce', ARRAY['sklep internetowy', 'e-commerce', 'handel elektroniczny', 'online', 'marketplace'], 'branża'),
  ('import', ARRAY['eksport', 'handel zagraniczny', 'sprowadzanie', 'celny'], 'branża'),
  ('eksport', ARRAY['import', 'handel zagraniczny', 'wywóz', 'międzynarodowy'], 'branża'),
  
  -- Gastronomia i Hotelarstwo
  ('gastronomia', ARRAY['restauracja', 'catering', 'jedzenie', 'food', 'kuchnia', 'bar', 'kawiarnia'], 'branża'),
  ('restauracja', ARRAY['gastronomia', 'jedzenie', 'lokal', 'bistro', 'kuchnia'], 'branża'),
  ('catering', ARRAY['gastronomia', 'eventy', 'obsługa imprez', 'jedzenie na wynos'], 'branża'),
  ('hotel', ARRAY['hotelarstwo', 'nocleg', 'turystyka', 'hospitality', 'pensjonat'], 'branża'),
  ('turystyka', ARRAY['podróże', 'travel', 'wycieczki', 'wakacje', 'biuro podróży'], 'branża'),
  
  -- Rolnictwo i Żywność
  ('rolnictwo', ARRAY['agriculture', 'farming', 'gospodarstwo', 'uprawa', 'hodowla', 'agro'], 'branża'),
  ('żywność', ARRAY['food', 'produkty spożywcze', 'jedzenie', 'artykuły spożywcze', 'fmcg'], 'branża'),
  ('mleczarnia', ARRAY['nabiał', 'mleko', 'sery', 'dairy', 'przetwórstwo mleka'], 'branża'),
  ('mięso', ARRAY['masarnia', 'ubojnia', 'przetwórstwo mięsa', 'wędliny'], 'branża'),
  
  -- Tekstylia i Moda
  ('moda', ARRAY['fashion', 'odzież', 'ubrania', 'tekstylia', 'galanteria'], 'branża'),
  ('odzież', ARRAY['moda', 'ubrania', 'konfekcja', 'tekstylia', 'garderoba'], 'branża'),
  ('tekstylia', ARRAY['tkaniny', 'materiały', 'odzież', 'włókna', 'fabrics'], 'branża'),
  
  -- Meble i Wnętrza
  ('meble', ARRAY['furniture', 'wyposażenie', 'umeblowanie', 'stolarka'], 'branża'),
  ('wnętrza', ARRAY['interior design', 'aranżacja', 'wystrój', 'dekoracja', 'architektura wnętrz'], 'branża'),
  
  -- Edukacja
  ('edukacja', ARRAY['nauka', 'szkolenia', 'kursy', 'education', 'kształcenie', 'uczelnia', 'szkoła'], 'branża'),
  ('szkoła', ARRAY['edukacja', 'nauka', 'placówka', 'szkolnictwo', 'nauczanie'], 'branża'),
  ('uczelnia', ARRAY['uniwersytet', 'akademia', 'studia', 'wyższa edukacja', 'politechnika'], 'branża'),

-- ============================================
-- STANOWISKA I FUNKCJE
-- ============================================

  ('dyrektor', ARRAY['ceo', 'prezes', 'zarząd', 'director', 'szef', 'kierownik', 'naczelnik', 'chief'], 'stanowisko'),
  ('prezes', ARRAY['dyrektor', 'ceo', 'właściciel', 'zarząd', 'przewodniczący', 'president'], 'stanowisko'),
  ('ceo', ARRAY['prezes', 'dyrektor generalny', 'chief executive officer', 'zarząd'], 'stanowisko'),
  ('cfo', ARRAY['dyrektor finansowy', 'chief financial officer', 'finanse', 'zarząd'], 'stanowisko'),
  ('cto', ARRAY['dyrektor techniczny', 'chief technology officer', 'it', 'technologia'], 'stanowisko'),
  ('coo', ARRAY['dyrektor operacyjny', 'chief operating officer', 'operacje'], 'stanowisko'),
  ('cmo', ARRAY['dyrektor marketingu', 'chief marketing officer', 'marketing'], 'stanowisko'),
  ('manager', ARRAY['kierownik', 'menedżer', 'szef działu', 'zarządzający', 'manager'], 'stanowisko'),
  ('kierownik', ARRAY['manager', 'menedżer', 'szef', 'head', 'lider', 'przełożony'], 'stanowisko'),
  ('specjalista', ARRAY['ekspert', 'specialist', 'fachowiec', 'analityk', 'konsultant'], 'stanowisko'),
  ('analityk', ARRAY['analyst', 'specjalista', 'badacz', 'ekspert'], 'stanowisko'),
  ('konsultant', ARRAY['doradca', 'consultant', 'ekspert', 'specjalista'], 'stanowisko'),
  ('handlowiec', ARRAY['sprzedawca', 'przedstawiciel handlowy', 'sales', 'account manager', 'key account'], 'stanowisko'),
  ('sprzedawca', ARRAY['handlowiec', 'sales', 'doradca klienta', 'przedstawiciel'], 'stanowisko'),
  ('programista', ARRAY['developer', 'coder', 'inżynier oprogramowania', 'software engineer', 'dev'], 'stanowisko'),
  ('developer', ARRAY['programista', 'inżynier', 'coder', 'twórca oprogramowania'], 'stanowisko'),
  ('inżynier', ARRAY['engineer', 'specjalista techniczny', 'projektant', 'konstruktor'], 'stanowisko'),
  ('architekt', ARRAY['projektant', 'designer', 'planista', 'kreator'], 'stanowisko'),
  ('projektant', ARRAY['designer', 'kreator', 'grafik', 'architekt'], 'stanowisko'),
  ('księgowa', ARRAY['accountant', 'księgowy', 'rachunkowiec', 'kadrowa'], 'stanowisko'),
  ('asystent', ARRAY['asystentka', 'assistant', 'sekretarka', 'pomoc', 'wsparcie'], 'stanowisko'),
  ('sekretarka', ARRAY['asystentka', 'sekretarz', 'recepcjonistka', 'office manager'], 'stanowisko'),
  ('prawnik', ARRAY['adwokat', 'radca prawny', 'attorney', 'lawyer', 'legal counsel'], 'stanowisko'),
  ('lekarz', ARRAY['doctor', 'medyk', 'specjalista', 'ordynator', 'physician'], 'stanowisko'),
  ('nauczyciel', ARRAY['teacher', 'pedagog', 'wykładowca', 'trener', 'edukator'], 'stanowisko'),
  ('trener', ARRAY['coach', 'szkoleniowiec', 'instruktor', 'mentor'], 'stanowisko'),
  ('właściciel', ARRAY['owner', 'założyciel', 'founder', 'przedsiębiorca', 'biznesmen'], 'stanowisko'),
  ('przedsiębiorca', ARRAY['biznesmen', 'owner', 'właściciel', 'entrepreneur', 'inwestor'], 'stanowisko'),
  ('freelancer', ARRAY['wolny strzelec', 'samozatrudniony', 'zleceniobiorca', 'niezależny'], 'stanowisko'),

-- ============================================
-- USŁUGI
-- ============================================

  ('wdrożenie', ARRAY['implementacja', 'uruchomienie', 'deployment', 'rollout', 'instalacja'], 'usługa'),
  ('implementacja', ARRAY['wdrożenie', 'realizacja', 'wykonanie', 'deployment'], 'usługa'),
  ('integracja', ARRAY['łączenie systemów', 'integration', 'synchronizacja', 'połączenie'], 'usługa'),
  ('migracja', ARRAY['przeniesienie', 'transfer', 'migration', 'upgrade'], 'usługa'),
  ('optymalizacja', ARRAY['usprawnienie', 'poprawa', 'optimization', 'efektywność'], 'usługa'),
  ('utrzymanie', ARRAY['maintenance', 'serwis', 'wsparcie', 'support', 'obsługa'], 'usługa'),
  ('wsparcie', ARRAY['support', 'pomoc', 'assistance', 'helpdesk', 'obsługa'], 'usługa'),
  ('outsourcing', ARRAY['zlecanie', 'zewnętrzne usługi', 'delegowanie', 'body leasing'], 'usługa'),
  ('tłumaczenia', ARRAY['translation', 'lokalizacja', 'przekłady', 'interpretacja'], 'usługa'),
  ('certyfikacja', ARRAY['certyfikat', 'atest', 'homologacja', 'akredytacja', 'iso'], 'usługa'),
  ('projektowanie', ARRAY['design', 'kreacja', 'tworzenie', 'opracowanie'], 'usługa'),
  ('analiza', ARRAY['badanie', 'research', 'ekspertyza', 'ocena', 'raport'], 'usługa'),
  ('strategia', ARRAY['planowanie', 'strategy', 'koncepcja', 'roadmap', 'plan'], 'usługa'),
  ('restrukturyzacja', ARRAY['reorganizacja', 'przekształcenie', 'transformacja'], 'usługa'),
  ('due diligence', ARRAY['badanie', 'analiza przedakwizycyjna', 'weryfikacja', 'audyt'], 'usługa'),
  ('fotografia', ARRAY['zdjęcia', 'photo', 'sesja zdjęciowa', 'fotograf'], 'usługa'),
  ('wideo', ARRAY['film', 'video', 'produkcja filmowa', 'montaż'], 'usługa'),
  ('druk', ARRAY['print', 'drukarnia', 'poligrafia', 'publikacje'], 'usługa'),
  ('event', ARRAY['eventy', 'organizacja imprez', 'konferencje', 'wydarzenia'], 'usługa'),
  ('catering', ARRAY['gastronomia', 'obsługa imprez', 'jedzenie'], 'usługa'),
  ('sprzątanie', ARRAY['cleaning', 'utrzymanie czystości', 'firma sprzątająca'], 'usługa'),
  ('ochrona', ARRAY['security', 'bezpieczeństwo', 'monitoring', 'ochroniarze'], 'usługa'),
  ('transport', ARRAY['przewóz', 'dostawa', 'shipping', 'logistyka'], 'usługa'),
  ('serwis', ARRAY['naprawa', 'service', 'konserwacja', 'maintenance'], 'usługa'),
  ('montaż', ARRAY['instalacja', 'assembly', 'składanie', 'setup'], 'usługa'),
  
-- ============================================
-- DODATKOWE KATEGORIE
-- ============================================

  -- Materiały i Surowce
  ('stal', ARRAY['metal', 'żelazo', 'steel', 'blacha', 'profile'], 'materiał'),
  ('aluminium', ARRAY['alu', 'metal', 'profile aluminiowe'], 'materiał'),
  ('drewno', ARRAY['drzewo', 'wood', 'tarcica', 'lumber', 'stolarka'], 'materiał'),
  ('beton', ARRAY['cement', 'concrete', 'wylewka', 'prefabrykaty'], 'materiał'),
  ('plastik', ARRAY['tworzywa sztuczne', 'plastic', 'polimer', 'pet', 'pvc'], 'materiał'),
  ('szkło', ARRAY['glass', 'szyby', 'witraże'], 'materiał'),
  ('papier', ARRAY['tektura', 'opakowania papierowe', 'celuloza'], 'materiał'),
  ('chemia', ARRAY['chemicals', 'substancje chemiczne', 'odczynniki', 'preparaty'], 'materiał'),
  
  -- Pojęcia biznesowe
  ('startup', ARRAY['start-up', 'nowa firma', 'przedsięwzięcie', 'venture'], 'biznes'),
  ('korporacja', ARRAY['corporation', 'duża firma', 'koncern', 'holding'], 'biznes'),
  ('msp', ARRAY['małe firmy', 'średnie przedsiębiorstwa', 'sme', 'mikroprzedsiębiorstwa'], 'biznes'),
  ('b2b', ARRAY['business to business', 'firmy', 'klienci biznesowi'], 'biznes'),
  ('b2c', ARRAY['business to consumer', 'konsumenci', 'klienci indywidualni'], 'biznes'),
  ('fuzja', ARRAY['merger', 'połączenie', 'konsolidacja', 'akwizycja'], 'biznes'),
  ('akwizycja', ARRAY['przejęcie', 'acquisition', 'kupno firmy'], 'biznes'),
  ('franczyza', ARRAY['franchising', 'franchise', 'licencja'], 'biznes'),
  ('joint venture', ARRAY['wspólne przedsięwzięcie', 'jv', 'partnerstwo'], 'biznes'),
  ('ipo', ARRAY['giełda', 'debiut giełdowy', 'emisja akcji', 'upublicznienie'], 'biznes'),
  
  -- Geograficzne
  ('polska', ARRAY['pl', 'polish', 'kraj', 'krajowy'], 'geografia'),
  ('europa', ARRAY['eu', 'unia europejska', 'european', 'kontynent'], 'geografia'),
  ('niemcy', ARRAY['germany', 'deutsche', 'de', 'niemiecki'], 'geografia'),
  ('usa', ARRAY['ameryka', 'stany zjednoczone', 'us', 'united states', 'american'], 'geografia'),
  ('chiny', ARRAY['china', 'chiński', 'azja', 'dalekowschodni'], 'geografia'),
  
  -- Certyfikaty i standardy
  ('iso', ARRAY['certyfikat', 'norma', 'standard', 'jakość', 'iso 9001'], 'certyfikat'),
  ('haccp', ARRAY['bezpieczeństwo żywności', 'certyfikat', 'higiena'], 'certyfikat'),
  ('gdpr', ARRAY['rodo', 'ochrona danych', 'prywatność', 'dane osobowe'], 'certyfikat'),
  ('pzp', ARRAY['zamówienia publiczne', 'przetargi', 'prawo zamówień publicznych'], 'certyfikat')

ON CONFLICT DO NOTHING;