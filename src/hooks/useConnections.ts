import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
export interface Connection {
  id: string;
  contact_a_id: string;
  contact_b_id: string;
  connection_type: string | null;
  strength: number | null;
}

export interface ContactNode {
  id: string;
  full_name: string;
  company: string | null;
  position: string | null;
  primary_group_id: string | null;
  group_color?: string | null;
  connection_count?: number;
}

export interface ConnectionPath {
  depth: number;
  path: string[];
  path_types: string[];
}

export interface MutualConnection {
  mutual_contact_id: string;
  mutual_contact_name: string;
  connection_to_a_type: string;
  connection_to_b_type: string;
}

export function useConnections() {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['connections', tenantId],
    queryFn: async () => {
      if (!tenantId) return { nodes: [], edges: [] };

      // Fetch contacts with their groups
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          id,
          full_name,
          company,
          position,
          primary_group_id,
          contact_groups:primary_group_id (color)
        `)
        .eq('is_active', true);

      if (contactsError) throw contactsError;

      // Fetch all connections
      const { data: connections, error: connectionsError } = await supabase
        .from('connections')
        .select('*');

      if (connectionsError) throw connectionsError;

      // Count connections per contact
      const connectionCounts: Record<string, number> = {};
      (connections || []).forEach((conn: Connection) => {
        connectionCounts[conn.contact_a_id] = (connectionCounts[conn.contact_a_id] || 0) + 1;
        connectionCounts[conn.contact_b_id] = (connectionCounts[conn.contact_b_id] || 0) + 1;
      });

      // Build nodes with connection counts
      const nodes: ContactNode[] = (contacts || []).map((contact: any) => ({
        id: contact.id,
        full_name: contact.full_name,
        company: contact.company,
        position: contact.position,
        primary_group_id: contact.primary_group_id,
        group_color: contact.contact_groups?.color || null,
        connection_count: connectionCounts[contact.id] || 0,
      }));

      return {
        nodes,
        edges: connections || [],
      };
    },
    enabled: !!tenantId,
  });
}

export function useFindConnectionPath(startContactId: string | null, endContactId: string | null) {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['connection-path', tenantId, startContactId, endContactId],
    queryFn: async () => {
      if (!tenantId || !startContactId || !endContactId) return null;

      const { data, error } = await supabase.rpc('find_connection_path', {
        p_tenant_id: tenantId,
        p_start_contact: startContactId,
        p_end_contact: endContactId,
        p_max_depth: 4,
      });

      if (error) throw error;
      return data as ConnectionPath[] | null;
    },
    enabled: !!tenantId && !!startContactId && !!endContactId,
  });
}

export function useMutualConnections(contactAId: string | null, contactBId: string | null) {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['mutual-connections', tenantId, contactAId, contactBId],
    queryFn: async () => {
      if (!tenantId || !contactAId || !contactBId) return [];

      const { data, error } = await supabase.rpc('find_mutual_connections', {
        p_tenant_id: tenantId,
        p_contact_a: contactAId,
        p_contact_b: contactBId,
      });

      if (error) throw error;
      return data as MutualConnection[];
    },
    enabled: !!tenantId && !!contactAId && !!contactBId,
  });
}

export function useContactConnections(contactId: string | null) {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['contact-connections', tenantId, contactId],
    queryFn: async () => {
      if (!tenantId || !contactId) return [];

      // Get connections where this contact is either A or B
      const { data: connections, error } = await supabase
        .from('connections')
        .select(`
          id,
          contact_a_id,
          contact_b_id,
          connection_type,
          strength
        `)
        .or(`contact_a_id.eq.${contactId},contact_b_id.eq.${contactId}`);

      if (error) throw error;

      // Get the other contact IDs
      const otherContactIds = (connections || []).map((conn: Connection) =>
        conn.contact_a_id === contactId ? conn.contact_b_id : conn.contact_a_id
      );

      if (otherContactIds.length === 0) return [];

      // Fetch the contact details
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, full_name, company, position')
        .in('id', otherContactIds);

      if (contactsError) throw contactsError;

      // Combine connections with contact details
      return (connections || []).map((conn: Connection) => {
        const otherId = conn.contact_a_id === contactId ? conn.contact_b_id : conn.contact_a_id;
        const otherContact = contacts?.find((c: any) => c.id === otherId);
        return {
          ...conn,
          connected_contact: otherContact,
        };
      });
    },
    enabled: !!tenantId && !!contactId,
  });
}

interface AddConnectionParams {
  contactAId: string;
  contactBId: string;
  connectionType: string;
  strength: number;
}

export function useAddConnection() {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactAId, contactBId, connectionType, strength }: AddConnectionParams) => {
      if (!tenantId) throw new Error('No tenant');

      // Check if connection already exists (in either direction)
      const { data: existing, error: checkError } = await supabase
        .from('connections')
        .select('id')
        .eq('tenant_id', tenantId)
        .or(`and(contact_a_id.eq.${contactAId},contact_b_id.eq.${contactBId}),and(contact_a_id.eq.${contactBId},contact_b_id.eq.${contactAId})`)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) throw new Error('Connection already exists');

      const { data, error } = await supabase
        .from('connections')
        .insert({
          tenant_id: tenantId,
          contact_a_id: contactAId,
          contact_b_id: contactBId,
          connection_type: connectionType,
          strength,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['contact-connections'] });
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['contact-connections'] });
    },
  });
}
