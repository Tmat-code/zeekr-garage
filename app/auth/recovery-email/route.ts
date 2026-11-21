// Dansk recovery-mail-skabelon som GoTrue henter (GOTRUE_MAILER_TEMPLATES_RECOVERY
// peger på denne URL). Go html/template udfylder {{ .SiteURL }} og {{ .TokenHash }}
// ved afsendelse. Linket går til /auth/confirm (token_hash → verifyOtp, cross-browser).
const TEMPLATE = `<!doctype html>
<html lang="da">
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.55;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;padding:28px;">
      <h2 style="margin:0 0 12px;font-size:20px;">Nulstil dit password</h2>
      <p style="margin:0 0 18px;">Du har bedt om at nulstille passwordet til din Zeekr Garage-konto. Klik på knappen for at vælge et nyt:</p>
      <p style="margin:0 0 22px;">
        <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nulstil"
           style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:9px;font-weight:600;">
          Vælg nyt password
        </a>
      </p>
      <p style="margin:0 0 4px;color:#6b7280;font-size:13px;">Virker knappen ikke, så kopiér dette link ind i din browser:</p>
      <p style="margin:0 0 22px;font-size:12px;word-break:break-all;color:#78716c;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nulstil</p>
      <p style="margin:0;color:#9ca3af;font-size:12px;">Har du ikke selv bedt om dette, kan du roligt ignorere mailen - dit password bliver ikke ændret.</p>
    </div>
  </body>
</html>`;

export async function GET() {
  return new Response(TEMPLATE, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
