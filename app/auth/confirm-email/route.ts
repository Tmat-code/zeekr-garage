// Bekraeftelses-mail-skabelon som GoTrue henter (GOTRUE_MAILER_TEMPLATES_CONFIRMATION
// peger paa denne URL). U4: indeholder da/sv/en og vaelger via {{ .Data.sprog }}
// (user_metadata, sat ved signup) - se lib/mail-skabelon.ts. Go html/template
// udfylder {{ .SiteURL }} og {{ .TokenHash }} ved afsendelse. Linket gaar til
// /auth/confirm (token_hash + verifyOtp, type=signup, cross-browser). Sendes naar
// en ny bruger opretter sig og ENABLE_EMAIL_AUTOCONFIRM er slaaet fra (double opt-in).
import { goSkabelon } from '@/lib/mail-skabelon';

const TEMPLATE = goSkabelon('bekraeft');

export async function GET() {
  return new Response(TEMPLATE, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }, // i18n-ok
  });
}
