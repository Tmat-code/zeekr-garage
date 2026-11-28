// U4: GoTrue (Supabase Auth) svarer med engelske fejltekster - aldrig vist
// direkte. Denne rene funktion (ingen Next/Supabase-import, virker på klient og
// server, testes af scripts/i18n-test.mjs) gør en fejl til en STABIL nøgle;
// komponenten slår så nøglen op i ordbogen (t.konto.gotrue / t.garage).
//
// Først fejlkoden (`error.code`, sat af nyere GoTrue/supabase-js), derefter
// tekst-mønstre som fallback (ældre GoTrue sender kun en besked). Ukendt -> null,
// og kalderen viser sin egen kontekst-fallback ("Kunne ikke logge ind ...").

export type GotrueFejl =
  | 'forkertLogin'
  | 'ikkeBekraeftet'
  | 'findesAllerede'
  | 'svagKode'
  | 'mailUgyldig'
  | 'forMange'
  | 'opretLukket'
  | 'sammeKode'
  | 'sammeMail'
  | 'linkUdloebet';

const KODER: Record<string, GotrueFejl> = {
  invalid_credentials: 'forkertLogin',
  email_not_confirmed: 'ikkeBekraeftet',
  user_already_exists: 'findesAllerede',
  email_exists: 'findesAllerede',
  weak_password: 'svagKode',
  email_address_invalid: 'mailUgyldig',
  validation_failed: 'mailUgyldig',
  over_email_send_rate_limit: 'forMange',
  over_request_rate_limit: 'forMange',
  over_sms_send_rate_limit: 'forMange',
  signup_disabled: 'opretLukket',
  email_provider_disabled: 'opretLukket',
  same_password: 'sammeKode',
  otp_expired: 'linkUdloebet',
  flow_state_expired: 'linkUdloebet',
  flow_state_not_found: 'linkUdloebet',
  bad_code_verifier: 'linkUdloebet',
};

export function gotrueFejl(
  err: { message?: string | null; code?: string | null } | null | undefined,
): GotrueFejl | null {
  if (!err) return null;
  const kode = (err.code ?? '').toString().toLowerCase();
  if (kode && KODER[kode]) return KODER[kode];

  const b = (err.message ?? '').toString().toLowerCase();
  if (!b) return null;
  if (b.includes('invalid login') || b.includes('invalid credentials')) return 'forkertLogin';
  if (b.includes('not confirmed')) return 'ikkeBekraeftet';
  if ((b.includes('same') || b.includes('different from the current')) && b.includes('email'))
    return 'sammeMail';
  if (b.includes('different from the old password') || (b.includes('same') && b.includes('password')))
    return 'sammeKode';
  if (b.includes('already registered') || b.includes('already been registered') || b.includes('already in use') || b.includes('already exists'))
    return 'findesAllerede';
  if (b.includes('weak') || b.includes('password should') || b.includes('password must') || b.includes('at least one character'))
    return 'svagKode';
  if (b.includes('rate limit') || b.includes('for security purposes') || b.includes('too many'))
    return 'forMange';
  if (b.includes('signup') && (b.includes('disabled') || b.includes('not allowed'))) return 'opretLukket';
  if (b.includes('signups not allowed')) return 'opretLukket';
  if ((b.includes('invalid') || b.includes('unable to validate')) && b.includes('email')) return 'mailUgyldig';
  if (b.includes('expired') || b.includes('invalid flow state') || b.includes('code verifier')) return 'linkUdloebet';
  return null;
}
