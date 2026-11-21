-- Meldingstype: fejl eller oenske (oenske = oensket funktionalitet).
-- Samme maskineri (bekraeftelser, status, rapporter) for begge - kun type adskiller.
create type public.issue_type as enum ('fejl', 'oenske');

alter table public.issues
  add column type public.issue_type not null default 'fejl';
