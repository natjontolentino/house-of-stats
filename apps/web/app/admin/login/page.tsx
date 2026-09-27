import { loginAction } from "./actions";
import { googleAdminConfigured } from "../../../lib/googleAdmin";

const ERROR_MESSAGES: Record<string, string> = {
  "1": "Incorrect password.",
  account: "That Google account isn't allowed to access the admin.",
  cancelled: "Google sign-in was cancelled.",
  state: "The sign-in session expired. Please try again.",
  google: "Google couldn't verify that sign-in. Please try again.",
  notconfigured: "Google sign-in isn't set up yet.",
  disabled: "Password sign-in is turned off. Use Google.",
};

export default function AdminLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const googleOnly = googleAdminConfigured();
  const error = searchParams.error ? (ERROR_MESSAGES[searchParams.error] ?? "Sign-in failed.") : null;

  return (
    <main className="page" style={{ maxWidth: 380, paddingTop: 64 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Admin sign in</h1>

      {googleOnly ? (
        <>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 0, marginBottom: 24 }}>
            Sign in with the Google account that manages this site.
          </p>
          {error && <p style={{ color: "var(--red)", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
          <a href="/api/admin/google/start" className="button-primary" style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}>
            Sign in with Google
          </a>
        </>
      ) : (
        <>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 0, marginBottom: 24 }}>
            Enter the admin password to manage your league.
          </p>
          <form action={loginAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="password"
              name="password"
              placeholder="Password"
              autoFocus
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-strong)",
                color: "var(--text)",
                background: "var(--panel)",
                fontSize: 14,
              }}
            />
            {error && <p style={{ color: "var(--red)", fontSize: 13, margin: 0 }}>{error}</p>}
            <button type="submit" className="button-primary">
              Sign in
            </button>
          </form>
        </>
      )}
    </main>
  );
}
