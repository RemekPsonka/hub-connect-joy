import { createClient as createClientRaw } from "npm:@supabase/supabase-js@2";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = createClientRaw as unknown as (...args: Parameters<typeof createClientRaw>) => any;
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_DAILY_REMINDERS = 20;

interface ReminderInsert {
  tenant_id: string;
  director_id: string;
  type: string;
  reference_type: string;
  reference_id: string;
  message: string;
  scheduled_at: string;
  priority: string;
}

interface Stats {
  deadline: number;
  overdue: number;
  inactive_project: number;
  contact: number;
}

// ── helpers ──────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getDailyCount(
  supabase: ReturnType<typeof createClient>,
  directorId: string
): Promise<number> {
  const { count } = await supabase
    .from("sovra_reminders")
    .select("id", { count: "exact", head: true })
    .eq("director_id", directorId)
    .gte("scheduled_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    .lt("scheduled_at", new Date(new Date().setHours(24, 0, 0, 0)).toISOString());
  return count ?? 0;
}

// ── check functions ──────────────────────────────────────

async function checkDeadlineTomorrow(
  supabase: ReturnType<typeof createClient>,
  directorId: string,
  tenantId: string
): Promise<ReminderInsert[]> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, project_id")
    .eq("assigned_to", directorId)
    .gte("due_date", `${tomorrowStr}T00:00:00`)
    .lt("due_date", `${tomorrowStr}T23:59:59`)
    .not("status", "in", '("done","cancelled")');

  if (!tasks?.length) return [];

  // Filter out already-reminded today
  const taskIds = tasks.map((t) => t.id);
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const todayEnd = new Date(new Date().setHours(24, 0, 0, 0)).toISOString();

  const { data: existing } = await supabase
    .from("sovra_reminders")
    .select("reference_id")
    .eq("type", "deadline")
    .in("reference_id", taskIds)
    .gte("scheduled_at", todayStart)
    .lt("scheduled_at", todayEnd);

  const existingIds = new Set((existing || []).map((e) => e.reference_id));

  return tasks
    .filter((t) => !existingIds.has(t.id))
    .map((t) => ({
      tenant_id: tenantId,
      director_id: directorId,
      type: "deadline",
      reference_type: "task",
      reference_id: t.id,
      message: `Zadanie "${t.title}" ma deadline jutro.`,
      scheduled_at: new Date().toISOString(),
      priority: "high",
    }));
}

async function checkOverdue(
  supabase: ReturnType<typeof createClient>,
  directorId: string,
  tenantId: string
): Promise<ReminderInsert[]> {
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, due_date")
    .eq("assigned_to", directorId)
    .lt("due_date", `${todayStr}T00:00:00`)
    .not("status", "in", '("done","cancelled")');

  if (!tasks?.length) return [];

  const taskIds = tasks.map((t) => t.id);
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const todayEnd = new Date(new Date().setHours(24, 0, 0, 0)).toISOString();

  const { data: existing } = await supabase
    .from("sovra_reminders")
    .select("reference_id")
    .eq("type", "overdue")
    .in("reference_id", taskIds)
    .gte("scheduled_at", todayStart)
    .lt("scheduled_at", todayEnd);

  const existingIds = new Set((existing || []).map((e) => e.reference_id));

  const now = new Date();
  return tasks
    .filter((t) => !existingIds.has(t.id))
    .map((t) => {
      const dueDate = new Date(t.due_date!);
      const diffDays = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        tenant_id: tenantId,
        director_id: directorId,
        type: "overdue",
        reference_type: "task",
        reference_id: t.id,
        message: `Zadanie "${t.title}" jest przeterminowane od ${diffDays} dni.`,
        scheduled_at: new Date().toISOString(),
        priority: "high",
      };
    });
}

async function checkInactiveProjects(
  supabase: ReturnType<typeof createClient>,
  directorId: string,
  tenantId: string
): Promise<ReminderInsert[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("owner_id", directorId)
    .in("status", ["new", "in_progress", "analysis"])
    .lt("updated_at", sevenDaysAgo);

  if (!projects?.length) return [];

  const projectIds = projects.map((p) => p.id);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from("sovra_reminders")
    .select("reference_id")
    .eq("type", "inactive_project")
    .in("reference_id", projectIds)
    .gte("scheduled_at", weekAgo);

  const existingIds = new Set((existing || []).map((e) => e.reference_id));

  return projects
    .filter((p) => !existingIds.has(p.id))
    .map((p) => ({
      tenant_id: tenantId,
      director_id: directorId,
      type: "inactive_project",
      reference_type: "project",
      reference_id: p.id,
      message: `Projekt "${p.name}" nie miał aktywności od 7 dni. Czas na review?`,
      scheduled_at: new Date().toISOString(),
      priority: "normal",
    }));
}

async function checkContactFollowUp(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  directorId: string
): Promise<ReminderInsert[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, full_name")
    .eq("tenant_id", tenantId)
    .lt("last_contact_date", thirtyDaysAgo)
    .not("last_contact_date", "is", null)
    .order("relationship_strength", { ascending: false, nullsFirst: false })
    .limit(5);

  if (!contacts?.length) return [];

  const contactIds = contacts.map((c) => c.id);
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from("sovra_reminders")
    .select("reference_id")
    .eq("type", "contact")
    .in("reference_id", contactIds)
    .gte("scheduled_at", twoWeeksAgo);

  const existingIds = new Set((existing || []).map((e) => e.reference_id));

  return contacts
    .filter((c) => !existingIds.has(c.id))
    .map((c) => ({
      tenant_id: tenantId,
      director_id: directorId,
      type: "contact",
      reference_type: "contact",
      reference_id: c.id,
      message: `Nie kontaktowałeś się z ${c.full_name} od 30+ dni.`,
      scheduled_at: new Date().toISOString(),
      priority: "normal",
    }));
}

// ── process one director ─────────────────────────────────

async function processDirector(
  supabase: ReturnType<typeof createClient>,
  directorId: string,
  tenantId: string
): Promise<Stats> {
  const stats: Stats = { deadline: 0, overdue: 0, inactive_project: 0, contact: 0 };

  let dailyCount = await getDailyCount(supabase, directorId);
  if (dailyCount >= MAX_DAILY_REMINDERS) return stats;

  const [deadlines, overdue, inactive, contacts] = await Promise.all([
    checkDeadlineTomorrow(supabase, directorId, tenantId),
    checkOverdue(supabase, directorId, tenantId),
    checkInactiveProjects(supabase, directorId, tenantId),
    checkContactFollowUp(supabase, tenantId, directorId),
  ]);

  const allReminders = [...deadlines, ...overdue, ...inactive, ...contacts];
  const remaining = MAX_DAILY_REMINDERS - dailyCount;
  const toInsert = allReminders.slice(0, remaining);

  if (toInsert.length > 0) {
    const { error } = await supabase.from("sovra_reminders").insert(toInsert);
    if (error) {
      console.error("Failed to insert reminders:", error.message);
      return stats;
    }
  }

  // Count inserted by type
  for (const r of toInsert) {
    if (r.type === "deadline") stats.deadline++;
    else if (r.type === "overdue") stats.overdue++;
    else if (r.type === "inactive_project") stats.inactive_project++;
    else if (r.type === "contact") stats.contact++;
  }

  return stats;
}

// ── main handler ─────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    // Path A: service_role call (cron) — process ALL directors
    if (token === serviceRoleKey) {
      const { data: directors } = await serviceClient
        .from("directors")
        .select("id, tenant_id");

      if (!directors?.length) {
        return jsonResponse({ reminders_created: 0, by_type: { deadline: 0, overdue: 0, inactive_project: 0, contact: 0 } });
      }

      const totalStats: Stats = { deadline: 0, overdue: 0, inactive_project: 0, contact: 0 };
      let totalCreated = 0;

      for (const dir of directors) {
        const stats = await processDirector(serviceClient, dir.id, dir.tenant_id);
        totalStats.deadline += stats.deadline;
        totalStats.overdue += stats.overdue;
        totalStats.inactive_project += stats.inactive_project;
        totalStats.contact += stats.contact;
        totalCreated += stats.deadline + stats.overdue + stats.inactive_project + stats.contact;
      }

      return jsonResponse({ reminders_created: totalCreated, by_type: totalStats });
    }

    // Path B: JWT call (manual from frontend) — process only this director
    const auth = await verifyAuth(req, serviceClient);
    if (isAuthError(auth)) {
      return unauthorizedResponse(auth, corsHeaders);
    }

    if (auth.userType !== "director" || !auth.directorId) {
      return jsonResponse({ error: "Sovra reminders are only for directors" }, 403);
    }

    const stats = await processDirector(serviceClient, auth.directorId, auth.tenantId);
    const totalCreated = stats.deadline + stats.overdue + stats.inactive_project + stats.contact;

    return jsonResponse({ reminders_created: totalCreated, by_type: stats });
  } catch (err) {
    console.error("sovra-reminder-trigger error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
