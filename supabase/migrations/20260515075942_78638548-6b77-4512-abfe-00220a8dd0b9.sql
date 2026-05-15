CREATE OR REPLACE FUNCTION public.convert_to_client(p_dtc_id uuid, p_areas jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_property_active      bool := COALESCE((p_areas->'property'->>'active')::bool, false);
  v_financial_active     bool := COALESCE((p_areas->'financial'->>'active')::bool, false);
  v_communication_active bool := COALESCE((p_areas->'communication'->>'active')::bool, false);
  v_life_group_active    bool := COALESCE((p_areas->'life_group'->>'active')::bool, false);

  v_property_premium_gr      bigint := COALESCE(((p_areas->'property'->>'annualPremiumPln')::numeric * 100)::bigint, 0);
  v_financial_premium_gr     bigint := COALESCE(((p_areas->'financial'->>'annualPremiumPln')::numeric * 100)::bigint, 0);
  v_communication_premium_gr bigint := COALESCE(((p_areas->'communication'->>'annualPremiumPln')::numeric * 100)::bigint, 0);
  v_life_group_premium_gr    bigint := COALESCE(((p_areas->'life_group'->>'annualPremiumPln')::numeric * 100)::bigint, 0);

  v_total_premium_gr bigint :=
    (CASE WHEN v_property_active      THEN v_property_premium_gr      ELSE 0 END) +
    (CASE WHEN v_financial_active     THEN v_financial_premium_gr     ELSE 0 END) +
    (CASE WHEN v_communication_active THEN v_communication_premium_gr ELSE 0 END) +
    (CASE WHEN v_life_group_active    THEN v_life_group_premium_gr    ELSE 0 END);
BEGIN
  IF NOT (v_property_active OR v_financial_active OR v_communication_active OR v_life_group_active) THEN
    RAISE EXCEPTION 'Konwersja na klienta wymaga zaznaczenia minimum jednego obszaru.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.deal_team_contacts SET
    category       = 'client',
    won_at         = COALESCE(won_at, now()),
    offering_stage = 'won',
    client_complexity = jsonb_build_object(
      'property_active',      v_property_active,
      'financial_active',     v_financial_active,
      'communication_active', v_communication_active,
      'life_group_active',    v_life_group_active,
      'referrals_count',      COALESCE((client_complexity->>'referrals_count')::int, 0),
      'references_count',     COALESCE((client_complexity->>'references_count')::int, 0)
    ),
    potential_property_gr      = CASE WHEN v_property_active      THEN v_property_premium_gr      ELSE 0 END,
    potential_financial_gr     = CASE WHEN v_financial_active     THEN v_financial_premium_gr     ELSE 0 END,
    potential_communication_gr = CASE WHEN v_communication_active THEN v_communication_premium_gr ELSE 0 END,
    potential_life_group_gr    = CASE WHEN v_life_group_active    THEN v_life_group_premium_gr    ELSE 0 END,
    expected_annual_premium_gr = v_total_premium_gr,
    updated_at = now()
  WHERE id = p_dtc_id;

  -- Domknij wszystkie otwarte zadania lejkowe powiązane z tym kontaktem
  UPDATE public.tasks
  SET status = 'completed',
      updated_at = now()
  WHERE deal_team_contact_id = p_dtc_id
    AND status IN ('todo', 'in_progress');
END;
$function$;

-- Backfill: domknij otwarte zadania dla istniejących klientów
UPDATE public.tasks t
SET status = 'completed', updated_at = now()
FROM public.deal_team_contacts dtc
WHERE t.deal_team_contact_id = dtc.id
  AND dtc.category = 'client'
  AND t.status IN ('todo', 'in_progress');