import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Stats collection ─────────────────────────────────────

interface ReportStats {
  period_start: string;
  period_end: string;
  period_label: string;
  tasks_completed: number;
  tasks_created: number;
  tasks_overdue: Array<{ id: string; title: string; due_date: string }>;
  upcoming_deadlines: Array<{ id: string; title: string; due_date: string }>;
  projects: Array<{ id: string; name: string; status: string; tasks_done: number; tasks_total: number }>;
  contacts_added: number;
  interactions: number;
  sovra_sessions: Record<string, number>;
  sovra_reminders: number;
}

async function collectStats(
  supabase: ReturnType<typeof createClient>,
  directorId: string,
  tenantId: string,
  frequency: string,
  includeSections: string[]
): Promise<ReportStats> {
  const now = new Date();
  const periodEnd = now.toISOString();
  const periodStart = new Date(
    frequency === "weekly"
      ? now.getTime() - 7 * 24 * 60 * 60 * 1000
      : now.getTime() - 24 * 60 * 60 * 1000
  ).toISOString();

  const formatDate = (d: Date) =>
    d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  const periodLabel =
    frequency === "weekly"
      ? `${formatDate(new Date(periodStart))} — ${formatDate(now)}`
      : formatDate(now);

  const stats: ReportStats = {
    period_start: periodStart,
    period_end: periodEnd,
    period_label: periodLabel,
    tasks_completed: 0,
    tasks_created: 0,
    tasks_overdue: [],
    upcoming_deadlines: [],
    projects: [],
    contacts_added: 0,
    interactions: 0,
    sovra_sessions: {},
    sovra_reminders: 0,
  };

  // Tasks stats
  if (includeSections.includes("tasks") || includeSections.includes("summary")) {
    const [completedRes, createdRes, overdueRes, upcomingRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", directorId)
        .eq("status", "done")
        .gte("updated_at", periodStart),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", directorId)
        .gte("created_at", periodStart),
      supabase
        .from("tasks")
        .select("id, title, due_date")
        .eq("assigned_to", directorId)
        .lt("due_date", now.toISOString())
        .not("status", "in", '("done","cancelled")')
        .limit(10),
      supabase
        .from("tasks")
        .select("id, title, due_date")
        .eq("assigned_to", directorId)
        .gte("due_date", now.toISOString())
        .lte("due_date", new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .not("status", "in", '("done","cancelled")')
        .order("due_date", { ascending: true })
        .limit(5),
    ]);

    stats.tasks_completed = completedRes.count ?? 0;
    stats.tasks_created = createdRes.count ?? 0;
    stats.tasks_overdue = (overdueRes.data || []).map((t) => ({
      id: t.id,
      title: t.title,
      due_date: t.due_date,
    }));
    stats.upcoming_deadlines = (upcomingRes.data || []).map((t) => ({
      id: t.id,
      title: t.title,
      due_date: t.due_date,
    }));
  }

  // Projects stats
  if (includeSections.includes("projects") || includeSections.includes("summary")) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, status")
      .eq("owner_id", directorId)
      .in("status", ["new", "in_progress", "analysis"]);

    if (projects?.length) {
      for (const p of projects) {
        const [doneRes, totalRes] = await Promise.all([
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("project_id", p.id)
            .eq("status", "done"),
          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("project_id", p.id),
        ]);
        stats.projects.push({
          id: p.id,
          name: p.name,
          status: p.status || "new",
          tasks_done: doneRes.count ?? 0,
          tasks_total: totalRes.count ?? 0,
        });
      }
    }
  }

  // Contacts stats
  if (includeSections.includes("contacts") || includeSections.includes("summary")) {
    const [addedRes, interactionsRes] = await Promise.all([
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", periodStart),
      supabase
        .from("contact_activity_log")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", periodStart),
    ]);
    stats.contacts_added = addedRes.count ?? 0;
    stats.interactions = interactionsRes.count ?? 0;
  }

  // Sovra stats
  if (includeSections.includes("summary")) {
    const [sessionsRes, remindersRes] = await Promise.all([
      supabase
        .from("sovra_sessions")
        .select("type")
        .eq("director_id", directorId)
        .gte("started_at", periodStart),
      supabase
        .from("sovra_reminders")
        .select("id", { count: "exact", head: true })
        .eq("director_id", directorId)
        .gte("scheduled_at", periodStart),
    ]);

    const sessions: Record<string, number> = {};
    for (const s of sessionsRes.data || []) {
      sessions[s.type] = (sessions[s.type] || 0) + 1;
    }
    stats.sovra_sessions = sessions;
    stats.sovra_reminders = remindersRes.count ?? 0;
  }

  return stats;
}

// ── AI Summary ───────────────────────────────────────────

async function generateAISummary(stats: ReportStats): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return `W tym okresie (${stats.period_label}) ukończono ${stats.tasks_completed} zadań, utworzono ${stats.tasks_created} nowych. Aktywnych projektów: ${stats.projects.length}. Nowych kontaktów: ${stats.contacts_added}.`;
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Jesteś Sovra — inteligentna asystentka CRM. Napisz krótkie podsumowanie tygodnia pracy (3-5 zdań) po polsku. Bądź konkretna — podaj liczby. Styl: profesjonalny, pozytywny ale rzeczowy. Jeśli są problemy (zaległości, brak aktywności) — wspomnij taktownie. Zakończ 1 zdaniem motywacji na przyszły tydzień.",
          },
          {
            role: "user",
            content: JSON.stringify({
              tasks_completed: stats.tasks_completed,
              tasks_created: stats.tasks_created,
              tasks_overdue_count: stats.tasks_overdue.length,
              upcoming_deadlines_count: stats.upcoming_deadlines.length,
              active_projects: stats.projects.length,
              contacts_added: stats.contacts_added,
              interactions: stats.interactions,
              sovra_sessions: stats.sovra_sessions,
              period: stats.period_label,
            }),
          },
        ],
        temperature: 0.5,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error("AI summary error:", response.status);
      return `W okresie ${stats.period_label}: ${stats.tasks_completed} ukończonych zadań, ${stats.tasks_overdue.length} zaległych, ${stats.projects.length} aktywnych projektów.`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || `Okres ${stats.period_label}: ${stats.tasks_completed} ukończonych zadań.`;
  } catch (err) {
    console.error("AI summary failed:", err);
    return `Okres ${stats.period_label}: ${stats.tasks_completed} ukończonych zadań, ${stats.contacts_added} nowych kontaktów.`;
  }
}

// ── HTML Email Builder ───────────────────────────────────

function buildEmailHtml(
  stats: ReportStats,
  aiSummary: string,
  includeSections: string[],
  frontendUrl: string
): string {
  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
    } catch {
      return d;
    }
  };

  let sectionsHtml = "";

  // AI Summary (always shown)
  sectionsHtml += `
    <tr>
      <td style="padding: 0 0 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3ff; border-left: 4px solid #7c3aed; border-radius: 0 8px 8px 0;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0; font-size: 14px; color: #4c1d95; font-style: italic; line-height: 1.6;">
                ${aiSummary}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  // Tasks section
  if (includeSections.includes("tasks")) {
    const overdueColor = stats.tasks_overdue.length > 0 ? "#dc2626" : "#6b7280";
    sectionsHtml += `
      <tr>
        <td style="padding: 0 0 24px 0;">
          <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1e1b4b;">📋 Zadania</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="padding: 0 6px 0 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; text-align: center;">
                  <tr><td style="padding: 12px 8px 4px 8px; font-size: 24px; font-weight: 700; color: #16a34a;">${stats.tasks_completed}</td></tr>
                  <tr><td style="padding: 0 8px 12px 8px; font-size: 11px; color: #15803d;">Ukończone</td></tr>
                </table>
              </td>
              <td width="33%" style="padding: 0 3px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; text-align: center;">
                  <tr><td style="padding: 12px 8px 4px 8px; font-size: 24px; font-weight: 700; color: #2563eb;">${stats.tasks_created}</td></tr>
                  <tr><td style="padding: 0 8px 12px 8px; font-size: 11px; color: #1d4ed8;">Utworzone</td></tr>
                </table>
              </td>
              <td width="33%" style="padding: 0 0 0 6px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${stats.tasks_overdue.length > 0 ? "#fef2f2" : "#f9fafb"}; border-radius: 8px; text-align: center;">
                  <tr><td style="padding: 12px 8px 4px 8px; font-size: 24px; font-weight: 700; color: ${overdueColor};">${stats.tasks_overdue.length}</td></tr>
                  <tr><td style="padding: 0 8px 12px 8px; font-size: 11px; color: ${overdueColor};">Zaległe</td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;

    // Upcoming deadlines
    if (stats.upcoming_deadlines.length > 0) {
      let deadlinesHtml = stats.upcoming_deadlines
        .map(
          (t) =>
            `<tr>
              <td style="padding: 6px 0; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6;">
                • ${t.title} <span style="color: #9ca3af; font-size: 12px;">— ${formatDate(t.due_date)}</span>
              </td>
            </tr>`
        )
        .join("");

      sectionsHtml += `
        <tr>
          <td style="padding: 0 0 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #6b7280;">Nadchodzące deadline'y:</p>
            <table width="100%" cellpadding="0" cellspacing="0">${deadlinesHtml}</table>
          </td>
        </tr>
      `;
    }
  }

  // Projects section
  if (includeSections.includes("projects") && stats.projects.length > 0) {
    let projectsHtml = stats.projects
      .map((p) => {
        const pct = p.tasks_total > 0 ? Math.round((p.tasks_done / p.tasks_total) * 100) : 0;
        const barWidth = Math.max(pct, 2);
        return `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
              <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 500; color: #374151;">${p.name}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="70%">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 4px; height: 6px;">
                      <tr>
                        <td width="${barWidth}%" style="background-color: #7c3aed; border-radius: 4px; height: 6px;"></td>
                        <td></td>
                      </tr>
                    </table>
                  </td>
                  <td width="30%" style="text-align: right; font-size: 12px; color: #6b7280; padding-left: 8px;">
                    ${p.tasks_done}/${p.tasks_total} zadań
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      })
      .join("");

    sectionsHtml += `
      <tr>
        <td style="padding: 0 0 24px 0;">
          <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1e1b4b;">📁 Projekty (${stats.projects.length})</p>
          <table width="100%" cellpadding="0" cellspacing="0">${projectsHtml}</table>
        </td>
      </tr>
    `;
  }

  // Contacts section
  if (includeSections.includes("contacts")) {
    sectionsHtml += `
      <tr>
        <td style="padding: 0 0 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e1b4b;">👥 Kontakty</p>
          <p style="margin: 0; font-size: 14px; color: #4b5563;">
            Nowych kontaktów: <strong>${stats.contacts_added}</strong> &nbsp;|&nbsp; Interakcji: <strong>${stats.interactions}</strong>
          </p>
        </td>
      </tr>
    `;
  }

  // Sovra activity
  if (includeSections.includes("summary")) {
    const briefings = stats.sovra_sessions["morning_brief"] || 0;
    const chats = stats.sovra_sessions["chat"] || 0;
    const debriefs = stats.sovra_sessions["debrief"] || 0;

    sectionsHtml += `
      <tr>
        <td style="padding: 0 0 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e1b4b;">✨ Sovra aktywność</p>
          <p style="margin: 0; font-size: 14px; color: #4b5563;">
            Briefów: <strong>${briefings}</strong> &nbsp;|&nbsp; Chatów: <strong>${chats}</strong> &nbsp;|&nbsp; Debriefów: <strong>${debriefs}</strong> &nbsp;|&nbsp; Przypomnień: <strong>${stats.sovra_reminders}</strong>
          </p>
        </td>
      </tr>
    `;
  }

  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); border-radius: 12px 12px 0 0; padding: 32px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 40px; height: 40px; background-color: rgba(255,255,255,0.2); border-radius: 50%; text-align: center; vertical-align: middle; font-size: 18px; font-weight: 700; color: #ffffff;">
                          S
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 20px; font-weight: 600; color: #ffffff; padding-bottom: 4px;">
                    Sovra — Raport ${stats.period_label.includes("—") ? "tygodniowy" : "dzienny"}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 14px; color: rgba(255,255,255,0.8);">
                    ${stats.period_label}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${sectionsHtml}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 16px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
                Wygenerowane przez Sovra • ConnectHub CRM
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a href="${frontendUrl}/settings?tab=integrations" style="color: #7c3aed; text-decoration: none;">Zarządzaj raportami</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${frontendUrl}/settings?tab=integrations" style="color: #9ca3af; text-decoration: none;">Wyłącz raporty</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Email sending ────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured — report saved but not emailed");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sovra <sovra@connecthub.pl>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend error:", response.status, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Email send failed:", err);
    return false;
  }
}

// ── Process single director ──────────────────────────────

async function processDirectorReport(
  supabase: ReturnType<typeof createClient>,
  directorId: string,
  tenantId: string,
  config: {
    id: string;
    frequency: string;
    include_sections: string[];
    email_override: string | null;
  },
  isPreview: boolean
): Promise<{ html: string; stats: ReportStats; sent: boolean }> {
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://hub-connect-joy.lovable.app";

  // Collect stats
  const stats = await collectStats(supabase, directorId, tenantId, config.frequency, config.include_sections);

  // Generate AI summary
  const aiSummary = await generateAISummary(stats);

  // Build HTML
  const html = buildEmailHtml(stats, aiSummary, config.include_sections, frontendUrl);

  let sent = false;

  if (!isPreview) {
    // Get director email
    const { data: director } = await supabase
      .from("directors")
      .select("email")
      .eq("id", directorId)
      .single();

    const recipientEmail = config.email_override || director?.email;
    if (recipientEmail) {
      const subject = `Sovra — Twój ${config.frequency === "weekly" ? "tydzień" : "dzień"} w liczbach (${stats.period_label})`;
      sent = await sendEmail(recipientEmail, subject, html);
    }

    // Save to sovra_sessions
    await supabase.from("sovra_sessions").insert({
      tenant_id: tenantId,
      director_id: directorId,
      type: "weekly_report",
      title: `Raport ${stats.period_label}`,
      content: JSON.stringify({ stats, ai_summary: aiSummary }),
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
    });

    // Update last_sent_at
    await supabase
      .from("sovra_report_config")
      .update({ last_sent_at: new Date().toISOString() })
      .eq("id", config.id);
  }

  return { html, stats, sent };
}

// ── Main handler ─────────────────────────────────────────

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

    // ── Path A: service_role (cron) — process ALL matching directors ──
    if (token === serviceRoleKey) {
      const { data: configs } = await serviceClient
        .from("sovra_report_config")
        .select("*, directors!inner(id, tenant_id, email)")
        .eq("enabled", true);

      if (!configs?.length) {
        return jsonResponse({ reports_sent: 0, reports_skipped: 0 });
      }

      const now = new Date();
      const currentDow = now.getDay(); // 0=Sunday
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      let reportsSent = 0;
      let reportsSkipped = 0;

      for (const config of configs) {
        // Schedule check
        const matchesSchedule =
          config.frequency === "weekly"
            ? config.day_of_week === currentDow
            : true; // daily always matches

        const alreadySentToday = config.last_sent_at && config.last_sent_at >= todayStart;

        if (!matchesSchedule || alreadySentToday) {
          reportsSkipped++;
          continue;
        }

        try {
          const director = (config as any).directors;
          await processDirectorReport(
            serviceClient,
            config.director_id,
            config.tenant_id,
            {
              id: config.id,
              frequency: config.frequency,
              include_sections: config.include_sections as string[],
              email_override: config.email_override,
            },
            false
          );
          reportsSent++;
        } catch (err) {
          console.error(`Report failed for director ${config.director_id}:`, err);
          reportsSkipped++;
        }
      }

      return jsonResponse({ reports_sent: reportsSent, reports_skipped: reportsSkipped });
    }

    // ── Path B: JWT (manual preview from frontend) ──
    const auth = await verifyAuth(req, serviceClient);
    if (isAuthError(auth)) {
      return unauthorizedResponse(auth, corsHeaders);
    }

    if (auth.userType !== "director" || !auth.directorId) {
      return jsonResponse({ error: "Reports are only available for directors" }, 403);
    }

    // Get or create default config for preview
    let { data: config } = await serviceClient
      .from("sovra_report_config")
      .select("*")
      .eq("director_id", auth.directorId)
      .maybeSingle();

    const includeSections = (config?.include_sections as string[]) || [
      "summary",
      "tasks",
      "projects",
      "contacts",
      "calendar",
    ];

    const result = await processDirectorReport(
      serviceClient,
      auth.directorId,
      auth.tenantId,
      {
        id: config?.id || "preview",
        frequency: config?.frequency || "weekly",
        include_sections: includeSections,
        email_override: config?.email_override || null,
      },
      true // isPreview
    );

    return jsonResponse({ preview_html: result.html, stats: result.stats });
  } catch (err) {
    console.error("sovra-weekly-report error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
