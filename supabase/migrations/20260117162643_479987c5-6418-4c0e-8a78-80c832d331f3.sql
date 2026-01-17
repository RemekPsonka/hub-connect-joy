-- Dodanie nowych kolumn do tabeli contacts
ALTER TABLE public.contacts ADD COLUMN title text;
ALTER TABLE public.contacts ADD COLUMN first_name text;
ALTER TABLE public.contacts ADD COLUMN last_name text;