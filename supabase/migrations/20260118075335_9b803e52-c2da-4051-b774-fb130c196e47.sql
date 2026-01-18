-- =============================================
-- TABELA ASSISTANTS - relacja asystent-dyrektor
-- =============================================
CREATE TABLE public.assistants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    director_id UUID REFERENCES public.directors(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id)
);

ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABELA ASSISTANT_GROUP_ACCESS - ograniczenie do grup
-- =============================================
CREATE TABLE public.assistant_group_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id UUID REFERENCES public.assistants(id) ON DELETE CASCADE NOT NULL,
    group_id UUID REFERENCES public.contact_groups(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assistant_id, group_id)
);

ALTER TABLE public.assistant_group_access ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNKCJA: sprawdzenie czy użytkownik jest asystentem
-- =============================================
CREATE OR REPLACE FUNCTION public.is_assistant(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assistants
    WHERE user_id = _user_id AND is_active = TRUE
  )
$$;

-- =============================================
-- FUNKCJA: pobieranie tenant_id dla asystenta
-- =============================================
CREATE OR REPLACE FUNCTION public.get_assistant_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.assistants
  WHERE user_id = _user_id AND is_active = TRUE
  LIMIT 1
$$;

-- =============================================
-- FUNKCJA: sprawdzenie dostępu asystenta do kontaktu
-- =============================================
CREATE OR REPLACE FUNCTION public.assistant_can_access_contact(_user_id UUID, _contact_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.assistants a
    JOIN public.assistant_group_access aga ON aga.assistant_id = a.id
    JOIN public.contacts c ON c.primary_group_id = aga.group_id
    WHERE a.user_id = _user_id 
      AND a.is_active = TRUE
      AND c.id = _contact_id
  )
$$;

-- =============================================
-- FUNKCJA: pobieranie dozwolonych group_ids dla asystenta
-- =============================================
CREATE OR REPLACE FUNCTION public.get_assistant_group_ids(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(aga.group_id)
  FROM public.assistants a
  JOIN public.assistant_group_access aga ON aga.assistant_id = a.id
  WHERE a.user_id = _user_id AND a.is_active = TRUE
$$;

-- =============================================
-- AKTUALIZACJA get_current_tenant_id() - obsługa asystentów
-- =============================================
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid() LIMIT 1),
    (SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid() AND is_active = TRUE LIMIT 1)
  )
$$;

-- =============================================
-- RLS dla assistants
-- =============================================
CREATE POLICY "director_can_manage_own_assistants" ON public.assistants
FOR ALL USING (
  director_id IN (
    SELECT id FROM public.directors WHERE user_id = auth.uid()
  )
  OR public.is_tenant_admin(auth.uid(), tenant_id)
  OR user_id = auth.uid()
);

-- =============================================
-- RLS dla assistant_group_access
-- =============================================
CREATE POLICY "manage_assistant_groups" ON public.assistant_group_access
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.assistants a
    JOIN public.directors d ON d.id = a.director_id
    WHERE a.id = assistant_group_access.assistant_id
      AND (d.user_id = auth.uid() OR public.is_tenant_admin(auth.uid(), a.tenant_id))
  )
  OR EXISTS (
    SELECT 1 FROM public.assistants a
    WHERE a.id = assistant_group_access.assistant_id
      AND a.user_id = auth.uid()
  )
);

-- =============================================
-- DODATKOWA POLITYKA dla contacts - dostęp asystentów
-- =============================================
CREATE POLICY "assistant_contact_access" ON public.contacts
FOR SELECT USING (
  public.assistant_can_access_contact(auth.uid(), id)
);

-- =============================================
-- POLITYKA dla contact_agent_memory - dostęp asystentów
-- =============================================
CREATE POLICY "assistant_agent_memory_access" ON public.contact_agent_memory
FOR ALL USING (
  public.assistant_can_access_contact(auth.uid(), contact_id)
);

-- =============================================
-- POLITYKA dla agent_conversations - dostęp asystentów
-- =============================================
CREATE POLICY "assistant_agent_conversations_access" ON public.agent_conversations
FOR ALL USING (
  public.assistant_can_access_contact(auth.uid(), contact_id)
);

-- =============================================
-- POLITYKA dla contact_groups - asystent widzi przypisane grupy
-- =============================================
CREATE POLICY "assistant_group_access_view" ON public.contact_groups
FOR SELECT USING (
  id IN (
    SELECT aga.group_id 
    FROM public.assistant_group_access aga
    JOIN public.assistants a ON a.id = aga.assistant_id
    WHERE a.user_id = auth.uid() AND a.is_active = TRUE
  )
);