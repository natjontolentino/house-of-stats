import "server-only";

/**
 * Thin wrapper around Resend's REST API (https://api.resend.com) -- a plain
 * fetch call rather than their SDK, to avoid a dependency for one endpoint.
 * A free Resend account with no verified domain can only send to the email
 * address that owns the account, using the from address onboarding@resend.dev
 * (https://resend.com/docs/knowledge-base/403-error-resend-dev-domain) -- that
 * is exactly this app's one use of it (notifying the site owner), so no
 * domain setup is needed. Silently does nothing if RESEND_API_KEY isn't set,
 * so the lead is still recorded in the database even before email is
 * configured.
 */
export async function sendAdminNotificationEmail(subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;
  if (!apiKey || !to) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "House of Stats <onboarding@resend.dev>",
        to: [to],
        subject,
        text,
      }),
    });
    if (!res.ok) {
      console.error("[resend] send failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("[resend] send threw", err instanceof Error ? err.message : err);
  }
}
