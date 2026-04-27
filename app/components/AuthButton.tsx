"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "../../lib/supabase/client";

type OtpState = "idle" | "sending" | "sent" | "error";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpState, setOtpState] = useState<OtpState>("idle");
  const [otpError, setOtpError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let supabase: ReturnType<typeof getBrowserSupabase>;
    try {
      supabase = getBrowserSupabase();
    } catch {
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setOauthError(null);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : "Google sign-in failed.");
      setSigningIn(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = otpEmail.trim();
    if (!email) return;
    setOtpState("sending");
    setOtpError(null);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setOtpState("sent");
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Failed to send link.");
      setOtpState("error");
    }
  };

  const handleSignOut = async () => {
    const supabase = getBrowserSupabase();
    await supabase.auth.signOut();
    setDropdownOpen(false);
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="auth-btn-wrap" ref={dropdownRef}>
        <button
          type="button"
          className="auth-signin-btn"
          onClick={() => setDropdownOpen((v) => !v)}
        >
          Sign in
        </button>
        {dropdownOpen && (
          <div className="auth-dropdown auth-dropdown--wide">
            <p className="auth-dropdown-title">Sign in to save your chats</p>

            {/* Email OTP */}
            {otpState === "sent" ? (
              <p className="auth-otp-sent">
                Check your inbox — we sent a magic link to <strong>{otpEmail}</strong>.
              </p>
            ) : (
              <form onSubmit={handleSendOtp} className="auth-otp-form">
                <input
                  type="email"
                  className="auth-otp-input"
                  placeholder="your@email.com"
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  disabled={otpState === "sending"}
                  autoComplete="email"
                />
                <button
                  type="submit"
                  className="auth-otp-btn"
                  disabled={otpState === "sending" || !otpEmail.trim()}
                >
                  {otpState === "sending" ? "Sending…" : "Send link"}
                </button>
                {otpState === "error" && otpError && (
                  <p className="auth-otp-error">{otpError}</p>
                )}
              </form>
            )}

            <div className="auth-or-divider">
              <span>or</span>
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              className="auth-oauth-btn"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
            >
              <GoogleIcon />
              {signingIn ? "Redirecting…" : "Continue with Google"}
            </button>
            {oauthError && <p className="auth-otp-error">{oauthError}</p>}
          </div>
        )}
      </div>
    );
  }

  const initials = (user.user_metadata?.full_name as string | undefined)
    ?.split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?";

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "User";

  return (
    <div className="auth-btn-wrap" ref={dropdownRef}>
      <button
        type="button"
        className="auth-avatar-btn"
        onClick={() => setDropdownOpen((v) => !v)}
        title={displayName}
        aria-label="Account menu"
      >
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={avatarUrl} alt={displayName} className="auth-avatar-img" />
        ) : (
          <span className="auth-avatar-initials">{initials}</span>
        )}
      </button>
      {dropdownOpen && (
        <div className="auth-dropdown">
          <p className="auth-dropdown-name">{displayName}</p>
          <p className="auth-dropdown-email">{user.email}</p>
          <hr className="auth-dropdown-divider" />
          <button
            type="button"
            className="auth-signout-btn"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}
