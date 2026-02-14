
-- Update get_dashboard_stats function to use 'todo' instead of 'pending' for task status
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS TABLE(total_contacts bigint, new_contacts_30d bigint, contacts_prev_30d bigint, today_consultations bigint, pending_tasks bigint, active_needs bigint, active_offers bigint, pending_matches bigint, upcoming_meetings bigint, healthy_contacts bigint, warning_contacts bigint, critical_contacts bigint, refreshed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID := get_current_tenant_id();
  v_director_id UUID := get_current_director_id();
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_tenant_admin(auth.uid(), v_tenant_id) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN QUERY
    SELECT 
      mv.total_contacts, mv.new_contacts_30d, mv.contacts_prev_30d,
      mv.today_consultations, mv.pending_tasks, mv.active_needs,
      mv.active_offers, mv.pending_matches, mv.upcoming_meetings,
      mv.healthy_contacts, mv.warning_contacts, mv.critical_contacts,
      mv.refreshed_at
    FROM mv_dashboard_stats mv
    WHERE mv.tenant_id = v_tenant_id;
  ELSE
    RETURN QUERY SELECT
      (SELECT COUNT(*) FROM contacts c 
       WHERE c.tenant_id = v_tenant_id 
       AND c.is_active = true 
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      (SELECT COUNT(*) FROM contacts c 
       WHERE c.tenant_id = v_tenant_id 
       AND c.is_active = true 
       AND c.created_at >= NOW() - INTERVAL '30 days'
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      (SELECT COUNT(*) FROM contacts c 
       WHERE c.tenant_id = v_tenant_id 
       AND c.is_active = true 
       AND c.created_at >= NOW() - INTERVAL '60 days'
       AND c.created_at < NOW() - INTERVAL '30 days'
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      (SELECT COUNT(*) FROM consultations co
       WHERE co.tenant_id = v_tenant_id
       AND co.director_id = v_director_id
       AND co.scheduled_at::date = CURRENT_DATE)::bigint,
       
      -- Changed: count 'todo' and 'in_progress' instead of 'pending'
      (SELECT COUNT(*) FROM tasks tk
       WHERE tk.tenant_id = v_tenant_id
       AND tk.status IN ('todo', 'in_progress')
       AND (tk.owner_id = v_director_id OR tk.assigned_to = v_director_id))::bigint,
       
      (SELECT COUNT(*) FROM needs n
       JOIN contacts c ON c.id = n.contact_id
       WHERE n.tenant_id = v_tenant_id
       AND n.status = 'active'
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      (SELECT COUNT(*) FROM offers o
       JOIN contacts c ON c.id = o.contact_id
       WHERE o.tenant_id = v_tenant_id
       AND o.status = 'active'
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      0::bigint,
       
      (SELECT COUNT(*) FROM group_meetings gm
       WHERE gm.tenant_id = v_tenant_id
       AND gm.status = 'upcoming')::bigint,
       
      (SELECT COUNT(*) FROM relationship_health rh
       JOIN contacts c ON c.id = rh.contact_id
       WHERE c.tenant_id = v_tenant_id
       AND rh.health_score >= 70
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      (SELECT COUNT(*) FROM relationship_health rh
       JOIN contacts c ON c.id = rh.contact_id
       WHERE c.tenant_id = v_tenant_id
       AND rh.health_score >= 40 AND rh.health_score <= 69
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      (SELECT COUNT(*) FROM relationship_health rh
       JOIN contacts c ON c.id = rh.contact_id
       WHERE c.tenant_id = v_tenant_id
       AND rh.health_score < 40
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      NOW();
  END IF;
END;
$function$;
