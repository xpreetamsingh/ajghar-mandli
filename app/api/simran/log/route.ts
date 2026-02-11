import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type LogSimranResponse = {
  new_steps_balance: number;
  today_total_minutes: number;
};

const MAX_SINGLE_LOG_MINUTES = 240;
const MIN_SINGLE_LOG_MINUTES = 1;

const getBearerToken = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
};

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized. Missing bearer token." },
      { status: 401 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  const {
    data: { user },
    error: userError
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized. Invalid auth token." },
      { status: 401 }
    );
  }

  let payload: { minutes?: number };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const minutes = payload.minutes;
  if (
    typeof minutes !== "number" ||
    !Number.isInteger(minutes) ||
    minutes < MIN_SINGLE_LOG_MINUTES ||
    minutes > MAX_SINGLE_LOG_MINUTES
  ) {
    return NextResponse.json(
      { error: "minutes must be an integer between 1 and 240." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc("log_simran_session", {
    p_user_id: user.id,
    p_minutes: minutes
  });

  if (error) {
    const message = error.message ?? "Could not log simran session.";
    const isDailyLimitError = /daily simran limit/i.test(message);

    return NextResponse.json(
      { error: message },
      { status: isDailyLimitError ? 409 : 500 }
    );
  }

  const row = (Array.isArray(data) ? data[0] : data) as LogSimranResponse | null;

  if (!row) {
    return NextResponse.json(
      { error: "No result from log_simran_session." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    newStepsBalance: row.new_steps_balance,
    todayTotalMinutes: row.today_total_minutes
  });
}
