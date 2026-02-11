"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (session) {
        router.replace("/dashboard");
      }
    };

    void checkSession();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = getSupabaseClient();
    const authMethod =
      mode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error: authError, data } = await authMethod;

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (mode === "signup" && !data.session) {
      setMessage("Signup successful. Check your email to confirm your account.");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <main>
      <section className="card">
        <h1>{mode === "login" ? "Login" : "Create an account"}</h1>
        <p className="muted">
          {mode === "login"
            ? "Sign in with your email and password."
            : "Create an account with email and password."}
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">
            Email
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label htmlFor="password">
            Password
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}

        <p className="muted">
          {mode === "login" ? "Need an account?" : "Already registered?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setMessage(null);
            }}
          >
            {mode === "login" ? "Create one" : "Back to login"}
          </button>
        </p>
      </section>
    </main>
  );
}
