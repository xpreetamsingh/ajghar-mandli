"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Profile = {
  display_name: string | null;
  steps_balance: number | null;
};

type SessionUserState = {
  accessToken: string;
};

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
};

const parseMinutes = (row: Record<string, unknown>) => {
  const candidates = ["minutes", "duration_minutes", "total_minutes"];

  for (const key of candidates) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
};

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUserState | null>(null);
  const [profile, setProfile] = useState<Profile>({
    display_name: null,
    steps_balance: null
  });
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logMinutes, setLogMinutes] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSessionData = async () => {
      setError(null);
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setSessionUser({ accessToken: session.access_token });
      setEmail(session.user.email ?? null);

      const profileById = await supabase
        .from("profiles")
        .select("display_name, steps_balance")
        .eq("id", session.user.id)
        .maybeSingle();

      const profileByUserId =
        profileById.data || !profileById.error
          ? profileById
          : await supabase
              .from("profiles")
              .select("display_name, steps_balance")
              .eq("user_id", session.user.id)
              .maybeSingle();

      if (profileByUserId.error) {
        setError(`Could not load profile: ${profileByUserId.error.message}`);
      } else {
        setProfile({
          display_name: profileByUserId.data?.display_name ?? null,
          steps_balance: profileByUserId.data?.steps_balance ?? null
        });
      }

      const { startIso, endIso } = getTodayRange();
      const sessionsResult = await supabase
        .from("simran_sessions")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("created_at", startIso)
        .lte("created_at", endIso);

      if (sessionsResult.error) {
        setError((prev) => prev ?? `Could not load today's minutes: ${sessionsResult.error.message}`);
      } else {
        const total = sessionsResult.data.reduce((sum, row) => {
          return sum + parseMinutes(row as Record<string, unknown>);
        }, 0);

        setTodayMinutes(total);
      }

      setLoading(false);
    };

    void loadSessionData();
  }, [router]);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const handleLogSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitMessage(null);
    setError(null);

    if (!sessionUser) {
      setError("Session not available. Please log in again.");
      return;
    }

    const minutes = Number(logMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
      setError("Minutes must be a whole number between 1 and 240.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/simran/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionUser.accessToken}`
        },
        body: JSON.stringify({ minutes })
      });

      const payload = (await response.json()) as {
        error?: string;
        newStepsBalance?: number;
        todayTotalMinutes?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not log simran session.");
      }

      setProfile((prev) => ({
        ...prev,
        steps_balance:
          typeof payload.newStepsBalance === "number" ? payload.newStepsBalance : prev.steps_balance
      }));

      if (typeof payload.todayTotalMinutes === "number") {
        setTodayMinutes(payload.todayTotalMinutes);
      }

      setSubmitMessage(`✨ Logged ${minutes} minutes successfully!`);
      setLogMinutes("10");
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Failed to log minutes. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = useMemo(() => {
    if (profile.display_name) return profile.display_name;
    return email?.split("@")[0] ?? "there";
  }, [email, profile.display_name]);

  if (loading) {
    return (
      <div className="game-shell">
        <main className="game-main">
          <section className="game-card">
            <p className="muted">Loading your dashboard...</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="game-shell">
      <header className="game-nav">
        <div>
          <strong className="brand">🌸 Simran Quest</strong>
          <p className="muted">Welcome back, {displayName}!</p>
        </div>
        <button className="secondary-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="game-main">
        <section className="game-grid">
          <article className="game-card">
            <h2>Your Steps</h2>
            <p className="big-number">{profile.steps_balance ?? 0}</p>
            <p className="muted">Today's simran minutes: {todayMinutes}</p>
          </article>

          <article className="game-card">
            <h2>Log Simran</h2>
            <p className="muted">Every minute gives you 10 steps.</p>
            <form onSubmit={handleLogSubmit} className="log-form">
              <label htmlFor="logMinutes">
                Minutes
                <input
                  id="logMinutes"
                  name="logMinutes"
                  type="number"
                  min={1}
                  max={240}
                  step={1}
                  value={logMinutes}
                  onChange={(event) => setLogMinutes(event.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={submitting}>
                {submitting ? "Logging..." : "Add minutes"}
              </button>
            </form>
            {submitMessage && <p className="success">{submitMessage}</p>}
            {error && <p className="error">{error}</p>}
          </article>

          <article className="game-card locked-card" aria-disabled>
            <h2>Go on a Quest</h2>
            <p className="muted">🔒 Locked</p>
            <p className="muted">Coming soon: convert steps into adventures and rewards.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
