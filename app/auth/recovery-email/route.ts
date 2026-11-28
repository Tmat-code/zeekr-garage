// Recovery-mail-skabelon som GoTrue henter (GOTRUE_MAILER_TEMPLATES_RECOVERY peger
// paa denne URL). U4: indeholder da/sv/en og vaelger via {{ .Data.sprog }}
// (user_metadata - brugerens gemte UI-sprog) - se lib/mail-skabelon.ts. Go
// html/template udfylder {{ .SiteURL }} og {{ .TokenHash }} ved afsendelse.
// Linket gaar til /auth/confirm (token_hash -> verifyOtp, cross-browser).
import { goSkabelon } from '@/lib/mail-skabelon';

const TEMPLATE = goSkabelon('nulstil');

export async function GET() {
  return new Response(TEMPLATE, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }, // i18n-ok
  });
}
