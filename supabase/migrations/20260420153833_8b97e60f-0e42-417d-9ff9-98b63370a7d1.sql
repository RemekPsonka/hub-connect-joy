ALTER TABLE public.deal_team_product_categories
  ADD COLUMN IF NOT EXISTS sales_area text
  CHECK (sales_area IN ('property','financial','communication','life_group'));

COMMENT ON COLUMN public.deal_team_product_categories.sales_area IS 'Mapowanie kategorii produktu na obszar sprzedaży (4 obszary kompleksowości klienta SGU)';
-- ROLLBACK: ALTER TABLE public.deal_team_product_categories DROP COLUMN sales_area;