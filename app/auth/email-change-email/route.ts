// Dansk mail-skift-skabelon som GoTrue henter (GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE
// peger på denne URL). Go html/template udfylder {{ .SiteURL }} og {{ .TokenHash }}
// ved afsendelse. Med "secure email change" sendes mailen til BÅDE den nuværende og
// den nye adresse (hver med sit eget token) - begge links skal klikkes før mailen
// skifter. Linket går til /auth/confirm (token_hash → verifyOtp, cross-browser).
const TEMPLATE = `<!doctype html>
<html lang="da">
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.55;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;padding:28px;">
      <h2 style="margin:0 0 12px;font-size:20px;">Bekræft din nye e-mail</h2>
      <p style="margin:0 0 18px;">Der er bedt om at skifte e-mailadressen på din Zeekr Garage-konto. Klik for at bekræfte:</p>
      <p style="margin:0 0 22px;">
        <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/garage"
           style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:9px;font-weight:600;">
          Bekræft e-mail
        </a>
      </p>
      <p style="margin:0 0 14px;color:#6b7280;font-size:13px;">Af sikkerhed sendes denne bekræftelse til både din nuværende og din nye adresse. Mailen skifter først når begge er bekræftet.</p>
      <p style="margin:0 0 4px;color:#6b7280;font-size:13px;">Virker knappen ikke, så kopiér dette link ind i din browser:</p>
      <p style="margin:0 0 22px;font-size:12px;word-break:break-all;color:#78716c;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/garage</p>
      <p style="margin:0;color:#9ca3af;font-size:12px;">Har du ikke selv bedt om dette, så ignorér mailen - din adresse bliver ikke ændret.</p>
    </div>
  </body>
</html>`;

export async function GET() {
  return new Response(TEMPLATE, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
