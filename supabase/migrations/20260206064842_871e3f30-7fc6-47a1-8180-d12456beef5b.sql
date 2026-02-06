-- =============================================
-- Granular RLS Policies for Deals Module
-- =============================================

-- 1. DEALS TABLE
-- ---------------------------------------------
DROP POLICY IF EXISTS "tenant_access" ON public.deals;

-- SELECT - everyone in tenant can view
CREATE POLICY "deals_select" ON public.deals
  FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

-- INSERT - only directors can create deals
CREATE POLICY "deals_insert" ON public.deals
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.directors 
      WHERE user_id = auth.uid() 
      AND tenant_id = public.get_current_tenant_id()
    )
  );

-- UPDATE - only directors can update deals
CREATE POLICY "deals_update" ON public.deals
  FOR UPDATE
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.directors 
      WHERE user_id = auth.uid()
    )
  );

-- DELETE - only tenant admins can delete deals
CREATE POLICY "deals_delete" ON public.deals
  FOR DELETE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.is_tenant_admin(auth.uid(), tenant_id)
  );

-- 2. DEAL_STAGES TABLE
-- ---------------------------------------------
DROP POLICY IF EXISTS "tenant_access" ON public.deal_stages;

-- SELECT - everyone in tenant can view stages
CREATE POLICY "deal_stages_select" ON public.deal_stages
  FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

-- INSERT - only admins can create stages
CREATE POLICY "deal_stages_insert" ON public.deal_stages
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND public.is_tenant_admin(auth.uid(), tenant_id)
  );

-- UPDATE - only admins can update stages
CREATE POLICY "deal_stages_update" ON public.deal_stages
  FOR UPDATE
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND public.is_tenant_admin(auth.uid(), tenant_id)
  );

-- DELETE - only admins can delete stages
CREATE POLICY "deal_stages_delete" ON public.deal_stages
  FOR DELETE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.is_tenant_admin(auth.uid(), tenant_id)
  );

-- 3. DEAL_PRODUCTS TABLE
-- ---------------------------------------------
DROP POLICY IF EXISTS "tenant_access" ON public.deal_products;

-- SELECT - via deal relationship
CREATE POLICY "deal_products_select" ON public.deal_products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
  );

-- INSERT - directors can add products
CREATE POLICY "deal_products_insert" ON public.deal_products
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.directors 
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE - directors can update products
CREATE POLICY "deal_products_update" ON public.deal_products
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.directors 
      WHERE user_id = auth.uid()
    )
  );

-- DELETE - directors can delete products
CREATE POLICY "deal_products_delete" ON public.deal_products
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.directors 
      WHERE user_id = auth.uid()
    )
  );

-- 4. DEAL_ACTIVITIES TABLE
-- ---------------------------------------------
DROP POLICY IF EXISTS "tenant_access" ON public.deal_activities;

-- SELECT - via deal relationship
CREATE POLICY "deal_activities_select" ON public.deal_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
  );

-- INSERT - directors can add activities
CREATE POLICY "deal_activities_insert" ON public.deal_activities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.directors 
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE - only author or admin
CREATE POLICY "deal_activities_update" ON public.deal_activities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
    AND (
      created_by = (SELECT id FROM public.directors WHERE user_id = auth.uid() LIMIT 1)
      OR public.is_tenant_admin(auth.uid(), public.get_current_tenant_id())
    )
  );

-- DELETE - only author or admin
CREATE POLICY "deal_activities_delete" ON public.deal_activities
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
    AND (
      created_by = (SELECT id FROM public.directors WHERE user_id = auth.uid() LIMIT 1)
      OR public.is_tenant_admin(auth.uid(), public.get_current_tenant_id())
    )
  );