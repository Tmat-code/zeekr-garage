// Mail-skift-skabelon som GoTrue henter (GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE
// peger paa denne URL). U8: indeholder da/sv/en og vaelger via {{ .Data.sprog }}
// (user_metadata - brugerens gemte UI-sprog) - se lib/mail-skabelon.ts. Med
// "secure email change" sendes mailen til BAADE den nuvaerende og den nye adresse
// (hver med sit eget token) - begge links skal klikkes foer mailen skifter.
// Linket gaar til /auth/confirm (token_hash -> verifyOtp, type=email_change).
import { goSkabelon } from '@/lib/mail-skabelon';

const TEMPLATE = goSkabelon('mailskift');

export async function GET() {
  return new Response(TEMPLATE, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }, // i18n-ok
  });
}
