// Simpel email-afsendelse via Resend's HTTP-API.
// Graceful: ingen RESEND_API_KEY => gør intet. Returnerer en kort `info` så
// afsenderen kan se HVORFOR der evt. ikke blev sendt (nøgle mangler, ingen
// modtagere, Resend-fejl). Modtagere sendes som BCC (ser ikke hinanden).
const SENDER = process.env.MAIL_FROM || 'Zeekr Garage <noreply@zeekr-garage.dk>';
const REPLY_TO = process.env.MAIL_REPLY_TO || 'noreply@zeekr-garage.dk';

export async function sendMailBcc(
  modtagere: string[],
  subject: string,
  html: string,
): Promise<{ sent: number; info: string }> {
  const key = process.env.RESEND_API_KEY;
  const rene = [...new Set(modtagere.filter((m) => typeof m === 'string' && m.includes('@')))];
  if (!key) return { sent: 0, info: 'RESEND_API_KEY mangler i miljøet' };
  if (rene.length === 0) return { sent: 0, info: 'ingen gyldige modtager-emails' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER,
        to: [REPLY_TO],
        bcc: rene,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { sent: 0, info: `Resend ${res.status}: ${txt.slice(0, 180)}` };
    }
    return { sent: rene.length, info: 'ok' };
  } catch (e: any) {
    return { sent: 0, info: `fetch-fejl: ${String(e?.message ?? e).slice(0, 140)}` };
  }
}
