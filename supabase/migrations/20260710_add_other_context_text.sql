alter table public.sidekick_context_logs
add column if not exists other_text text;

alter table public.sidekick_context_logs
drop constraint if exists sidekick_context_logs_other_text_length;

alter table public.sidekick_context_logs
add constraint sidekick_context_logs_other_text_length
check (char_length(other_text) <= 200);
