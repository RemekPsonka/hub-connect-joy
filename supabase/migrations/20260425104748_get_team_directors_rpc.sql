-- HOTFIX-ODPRAWA-2BUGS: RPC zwraca directorów teamu omijając RLS na deal_team_members.
-- Powód: dotychczasowe query `deal_team_members JOIN directors` nie zawsze zwracało
-- pełną listę dla wszystkich userów (komplikacja polityk dtm_select).
-- ROLLBACK: DROP FUNCTION public.get_team_directors(uuid);

CREATE OR REPLACE FUNCTION public.get_team_directors(p_team_id uuid)
RETURNS TABLE(id uuid, full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT d.id, d.full_name, d.email
  FROM public.deal_team_members dtm
  JOIN public.directors d ON d.id = dtm.director_id
  WHERE dtm.team_id = p_team_id
    AND dtm.is_active = true
    AND public.is_deal_team_member(p_team_id) -- caller musi być w teamie
  ORDER BY d.full_name;
$function$;

GRANT EXECUTE ON FUNCTION public.get_team_directors(uuid) TO authenticated;
