// Dansk bekraeftelses-mail-skabelon som GoTrue henter (GOTRUE_MAILER_TEMPLATES_CONFIRMATION
// peger paa denne URL). Go html/template udfylder {{ .SiteURL }} og {{ .TokenHash }}
// ved afsendelse. Linket gaar til /auth/confirm (token_hash + verifyOtp, type=signup,
// cross-browser - samme rute som recovery). Sendes naar en ny bruger opretter sig
// og ENABLE_EMAIL_AUTOCONFIRM er slaaet fra (double opt-in).
const TEMPLATE = `<!doctype html>
<html lang="da">
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.55;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;padding:28px;">
      <h2 style="margin:0 0 12px;font-size:20px;">Bekræft din konto</h2>
      <p style="margin:0 0 18px;">Velkommen til Zeekr Garage. Klik på knappen for at bekræfte din e-mail og aktivere din konto:</p>
      <p style="margin:0 0 22px;">
        <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/"
           style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:9px;font-weight:600;">
          Bekræft min konto
        </a>
      </p>
      <p style="margin:0 0 4px;color:#6b7280;font-size:13px;">Virker knappen ikke, så kopiér dette link ind i din browser:</p>
      <p style="margin:0 0 22px;font-size:12px;word-break:break-all;color:#78716c;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/</p>
      <p style="margin:0;color:#9ca3af;font-size:12px;">Har du ikke selv oprettet en konto hos Zeekr Garage, kan du roligt ignorere mailen - der sker ikke noget.</p>
    </div>
  </body>
</html>`;

export async function GET() {
  return new Response(TEMPLATE, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
