create table if not exists policy (
  policy_id text primary key,
  version text not null default 'v1',
  regulation_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists ruleset (
  ruleset_id text primary key,
  policy_id text not null references policy(policy_id) on delete cascade,
  created_at timestamptz not null default now(),
  normalized_policy_json jsonb,
  ruleset_json jsonb not null,
  testsuite_json jsonb,
  verification_report_json jsonb
);

create table if not exists lint_run (
  run_id text primary key,
  ruleset_id text not null references ruleset(ruleset_id),
  created_at timestamptz not null default now(),
  result_json jsonb not null
);
