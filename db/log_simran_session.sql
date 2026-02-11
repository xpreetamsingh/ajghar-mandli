-- Apply this SQL in your Supabase Postgres database.
-- It performs the requested workflow in a single transaction when invoked via RPC.

create or replace function public.log_simran_session(
  p_user_id uuid,
  p_minutes integer
)
returns table(new_steps_balance integer, today_total_minutes integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_total integer;
  v_new_total integer;
  v_delta_steps integer;
  v_current_balance integer;
begin
  if p_minutes is null or p_minutes < 1 or p_minutes > 240 then
    raise exception 'minutes must be between 1 and 240';
  end if;

  select coalesce(sum(minutes), 0)
  into v_today_total
  from public.simran_sessions
  where user_id = p_user_id
    and created_at >= date_trunc('day', now())
    and created_at < date_trunc('day', now()) + interval '1 day';

  v_new_total := v_today_total + p_minutes;

  if v_new_total > 180 then
    raise exception 'Daily simran limit exceeded (max 180 minutes).';
  end if;

  v_delta_steps := p_minutes * 10;

  insert into public.simran_sessions (user_id, minutes)
  values (p_user_id, p_minutes);

  insert into public.step_transactions (user_id, delta_steps, reason)
  values (p_user_id, v_delta_steps, 'simran_log');

  update public.profiles
  set steps_balance = coalesce(steps_balance, 0) + v_delta_steps
  where id = p_user_id
  returning steps_balance into v_current_balance;

  if v_current_balance is null then
    update public.profiles
    set steps_balance = coalesce(steps_balance, 0) + v_delta_steps
    where user_id = p_user_id
    returning steps_balance into v_current_balance;
  end if;

  if v_current_balance is null then
    raise exception 'Profile not found for user %', p_user_id;
  end if;

  return query
  select v_current_balance, v_new_total;
end;
$$;
