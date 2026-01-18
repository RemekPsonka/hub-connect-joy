import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  user: { id: string; email?: string };
  tenantId: string;
  userType: 'director' | 'assistant';
  directorId?: string;
  assistantId?: string;
}

export interface AuthError {
  error: string;
  status: number;
}

/**
 * Verify user authorization from request headers and return tenant info.
 * This function should be called at the beginning of every edge function.
 */
export async function verifyAuth(
  req: Request,
  supabase: SupabaseClient
): Promise<AuthResult | AuthError> {
  // 1. Check for Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { error: "Missing authorization header", status: 401 };
  }

  // 2. Verify the token
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { error: "Invalid or expired token", status: 401 };
  }

  // 3. Get tenant_id from directors table
  const { data: director } = await supabase
    .from("directors")
    .select("id, tenant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (director) {
    return {
      user: { id: user.id, email: user.email },
      tenantId: director.tenant_id,
      userType: 'director',
      directorId: director.id,
    };
  }

  // 4. Check if user is an assistant
  const { data: assistant } = await supabase
    .from("assistants")
    .select("id, tenant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (assistant) {
    return {
      user: { id: user.id, email: user.email },
      tenantId: assistant.tenant_id,
      userType: 'assistant',
      assistantId: assistant.id,
    };
  }

  return { error: "User not associated with any tenant", status: 403 };
}

/**
 * Check if auth result is an error
 */
export function isAuthError(result: AuthResult | AuthError): result is AuthError {
  return 'error' in result;
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(error: AuthError, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: error.error }),
    { 
      status: error.status, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}

/**
 * Verify that a resource belongs to the user's tenant
 */
export async function verifyResourceAccess(
  supabase: SupabaseClient,
  tableName: string,
  resourceId: string,
  tenantId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from(tableName)
    .select("tenant_id")
    .eq("id", resourceId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return data.tenant_id === tenantId;
}

/**
 * Create access denied response
 */
export function accessDeniedResponse(corsHeaders: Record<string, string>, message = "Access denied to this resource"): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 403, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}
