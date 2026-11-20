-- Ekstra felter på en melding (bugherrer-paritet):
--  software_version: hvilken OTA/software brugeren er på (model + version = bevis).
--  phone_model/phone_os: valgfrit, til telefon-relaterede fejl (CarPlay/Android Auto).
alter table public.issues
  add column software_version text,
  add column phone_model text,
  add column phone_os text;
