import { loginAction } from "./actions";

export default function AdminLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="page" style={{ maxWidth: 380, paddingTop: 64 }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Admin sign in</h1>
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
        {searchParams.error && (
          <p style={{ color: "var(--red)", fontSize: 13, margin: 0 }}>Incorrect password.</p>
        )}
        <button type="submit" className="button-primary">
          Sign in
        </button>
      </form>
    </main>
  );
}
