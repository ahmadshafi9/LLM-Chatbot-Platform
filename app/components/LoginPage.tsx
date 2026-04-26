"use client";

/**
 * LoginPage — not wired to any route yet.
 *
 * Wire it up when you're ready to add authentication:
 *   1. Create app/login/page.tsx and render <LoginPage />.
 *   2. Implement onLogin to call your auth endpoint / Supabase Auth.
 *
 * Usage:
 *   <LoginPage onLogin={(email, password) => { ... }} />
 */

import { useState } from "react";

interface LoginPageProps {
  /** Called when the user submits valid credentials. */
  onLogin?: (email: string, password: string) => Promise<void> | void;
  /** Optional error message to display (e.g. "Invalid credentials"). */
  errorMessage?: string;
}

export default function LoginPage({ onLogin, errorMessage }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = errorMessage ?? localError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      await onLogin?.(email.trim(), password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Sign in</h1>
        <p style={styles.subtitle}>Access your AI groups and course materials.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={styles.input}
              disabled={loading}
              autoComplete="email"
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              disabled={loading}
              autoComplete="current-password"
            />
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={styles.note}>
          Don&apos;t have an account?{" "}
          <span style={styles.link}>Sign up coming soon.</span>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f2f5",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "#fff",
    borderRadius: "16px",
    padding: "40px 36px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.09)",
  },
  title: {
    margin: "0 0 6px",
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "#111",
  },
  subtitle: {
    margin: "0 0 28px",
    fontSize: "0.9rem",
    color: "#6b7280",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#374151",
  },
  input: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "1rem",
    background: "#fafafa",
    color: "#111",
    outline: "none",
    transition: "border-color 0.15s",
  },
  error: {
    margin: "0",
    fontSize: "0.85rem",
    color: "#dc2626",
    background: "#fef2f2",
    padding: "8px 12px",
    borderRadius: "8px",
  },
  button: {
    marginTop: "4px",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "filter 0.15s",
  },
  note: {
    marginTop: "20px",
    fontSize: "0.83rem",
    color: "#6b7280",
    textAlign: "center",
  },
  link: {
    color: "#4f46e5",
    fontWeight: 600,
  },
};
