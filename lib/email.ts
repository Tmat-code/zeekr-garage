// Simpel email-afsendelse via Resend's HTTP-API.
// Graceful: ingen RESEND_API_KEY => gør intet (returnerer sent: 0), intet brækker.
// Modtagere sendes som BCC, så de ikke kan se hinandens adresser.
const SENDER = process.env.MAIL_FROM || 'Zeekr Garage <noreply@zeekr-garage.dk>';
const REPLY_TO = process.env.MAIL_REPLY_TO || 'noreply@zeekr-garage.dk';

export async function sendMailBcc(
  modtagere: string[],
  subject: string,
  html: string,
): Promise<{ sent: number; ok: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const rene = [...new Set(modtagere.filter((m) => m && m.includes('@')))];
  if (!key || rene.length === 0) return { sent: 0, ok: false };

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
    return { sent: res.ok ? rene.length : 0, ok: res.ok };
  } catch {
    return { sent: 0, ok: false };
  }
}
