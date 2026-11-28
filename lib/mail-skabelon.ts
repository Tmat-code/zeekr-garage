// U4: GoTrue-mailskabeloner (bekræft konto + nulstil password) på da/sv/en.
// U8: + mail-skift (email_change), samme mekanik.
//
// GoTrue henter skabelonen fra vores URL (MAILER_TEMPLATES_*) og kører den som
// Go html/template med { SiteURL, TokenHash, Data = user_metadata, ... }. Vi
// leverer ÉN skabelon med alle tre sprog, og Go-skabelonen vælger ud fra
// `.Data.sprog` (sat ved signup i LoginForm og ved hvert sprogvalg via
// gemSprogPaaBruger). Mangler/ukendt sprog -> dansk, som før.
//
// Emnet er en Coolify-env (MAILER_SUBJECTS_*), som GoTrue også parser som Go-
// skabelon. `goEmne()` giver værdien der skal stå i env'en. Den bruger bevidst
// INGEN `$` (hverken variabler eller `$.`): Docker Compose ville tolke `$l`
// som en miljøvariabel. Skabelon-kroppen hentes over HTTP og må gerne bruge `$.`.
//
// Rene funktioner (ingen Next-import), så scripts/mail-test.go kan rendere
// skabelonerne med den rigtige Go-motor.

import { ORDBOGER, UI_SPROG, type UiSprog } from '@/lib/i18n';

export type MailType = 'bekraeft' | 'nulstil' | 'mailskift';

// NB: `$.` (skabelonens rod), ikke `.` - sprog-valget sker inde i en
// `{{ with .Data.sprog }}`, som binder `.` om til sprog-værdien.
const LINK: Record<MailType, string> = {
  bekraeft: '{{ $.SiteURL }}/auth/confirm?token_hash={{ $.TokenHash }}&type=signup&next=/', // i18n-ok
  nulstil: '{{ $.SiteURL }}/auth/confirm?token_hash={{ $.TokenHash }}&type=recovery&next=/nulstil', // i18n-ok
  // Med "secure email change" sender GoTrue én mail til HVER adresse, hver med
  // sit eget TokenHash - skabelonen er den samme, så `$.TokenHash` er rigtig i begge.
  mailskift: '{{ $.SiteURL }}/auth/confirm?token_hash={{ $.TokenHash }}&type=email_change&next=/garage', // i18n-ok
};

function html(type: MailType, sprog: UiSprog): string {
  const m = ORDBOGER[sprog].mail;
  const t: { titel: string; intro: string; knap: string; ignorer: string; note?: string } = m[type];
  const link = LINK[type];
  // Kun mail-skift har en ekstra note (sendes til begge adresser).
  const note = t.note
    ? `\n      <p style="margin:0 0 14px;color:#6b7280;font-size:13px;">${t.note}</p>` // i18n-ok
    : '';
  // Ramme-HTML (ingen tekst - teksterne kommer fra ordbogen).
  return /* i18n-ok */ `<!doctype html>
<html lang="${sprog}">
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.55;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;padding:28px;">
      <h2 style="margin:0 0 12px;font-size:20px;">${t.titel}</h2>
      <p style="margin:0 0 18px;">${t.intro}</p>
      <p style="margin:0 0 22px;">
        <a href="${link}"
           style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:9px;font-weight:600;">
          ${t.knap}
        </a>
      </p>${note}
      <p style="margin:0 0 4px;color:#6b7280;font-size:13px;">${m.kopierLink}</p>
      <p style="margin:0 0 22px;font-size:12px;word-break:break-all;color:#78716c;">${link}</p>
      <p style="margin:0;color:#9ca3af;font-size:12px;">${t.ignorer}</p>
    </div>
  </body>
</html>`;
}

// Go-udtryk: er brugerens sprog (user_metadata.sprog) lig `s`? `with` springer
// over når sprog mangler (nil/tom), og printf gør en evt. ikke-streng-værdi til
// tekst, så `eq` aldrig fejler på typen.
// `q` = citat-tegnet. Emnet (Coolify-env) bruger backticks (Go raw strings), så
// værdien hverken indeholder `"` eller `$` - den overlever .env-citering og
// Compose-interpolation uændret.
const ER = (s: string, q = '"') => `eq (printf ${q}%v${q} .) ${q}${s}${q}`; // i18n-ok

// Hele skabelonen: sv/en hvis valgt, ellers dansk (også for gamle brugere uden
// sprog i metadata).
export function goSkabelon(type: MailType): string {
  return vaelgSprog((s) => html(type, s));
}

// Værdien til MAILER_SUBJECTS_CONFIRMATION / _RECOVERY / _EMAIL_CHANGE i Coolify.
export function goEmne(type: MailType): string {
  return vaelgSprog((s) => ORDBOGER[s].mail[type].emne, '`');
}

// `{{ with .Data.sprog }}{{ if sv }}..{{ else if en }}..{{ else }}DA{{ end }}{{ else }}DA{{ end }}`
// - ydre else = intet sprog i metadata (eller ingen metadata).
function vaelgSprog(indhold: (s: UiSprog) => string, q = '"'): string {
  const andre = UI_SPROG.filter((s) => s !== 'da');
  const da = indhold('da');
  let ud = '{{ with .Data.sprog }}'; // i18n-ok
  andre.forEach((s, i) => {
    ud += `{{ ${i === 0 ? 'if' : 'else if'} ${ER(s, q)} }}${indhold(s)}`; // i18n-ok
  });
  return `${ud}{{ else }}${da}{{ end }}{{ else }}${da}{{ end }}`; // i18n-ok
}
