import { createSupabaseAdminClient } from "../../../../lib/supabaseAdminClient";
import { setLeadStatusAction } from "./actions";
import { LocalTime } from "../../../../components/LocalTime";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  onboarded: "Onboarded",
  dismissed: "Dismissed",
};

export default async function AdminLeadsPage() {
  const supabase = createSupabaseAdminClient();
  const { data: leads } = await supabase.from("league_lead").select("*").order("created_at", { ascending: false });

  return (
    <main className="page" style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: 22, margin: "4px 0 4px" }}>League leads</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px" }}>
        Submitted from the public &quot;Add your league&quot; popup. Onboard someone by creating their league from
        the League page, then mark them Onboarded here.
      </p>

      {(leads ?? []).length === 0 ? (
        <p className="card" style={{ padding: 16, color: "var(--muted)" }}>No inquiries yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(leads ?? []).map((lead) => (
            <div key={lead.id} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{lead.league_name}</p>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>
                    <LocalTime iso={lead.created_at} />
                  </p>
                </div>
                <span className={`badge badge--${lead.status === "new" ? "live" : lead.status === "dismissed" ? "scheduled" : "final"}`}>
                  {STATUS_LABEL[lead.status] ?? lead.status}
                </span>
              </div>

              <p style={{ fontSize: 13, margin: 0 }}>
                {lead.contact_name}
                {lead.contact_number ? ` · ${lead.contact_number}` : ""}
              </p>

              <form action={setLeadStatusAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <input type="hidden" name="leadId" value={lead.id} />
                {(["new", "contacted", "onboarded", "dismissed"] as const)
                  .filter((s) => s !== lead.status)
                  .map((s) => (
                    <button
                      key={s}
                      type="submit"
                      name="status"
                      value={s}
                      className="button-secondary"
                      style={{ fontSize: 12, padding: "6px 10px" }}
                    >
                      Mark {STATUS_LABEL[s]}
                    </button>
                  ))}
              </form>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
