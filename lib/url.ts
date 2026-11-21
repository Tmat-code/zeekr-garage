// Finder appens OFFENTLIGE origin ud fra request-headers.
// Next.js standalone binder til 0.0.0.0:3000, saa `request.url` peger paa den
// interne adresse - en redirect bygget paa den sender browseren til
// https://0.0.0.0:3000. Bag Cloudflare Tunnel kommer det rigtige vaertsnavn i
// Host- (eller X-Forwarded-Host-) headeren, saa vi bruger den i stedet.
export function publicOrigin(request: Request): string {
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;
  return process.env.SITE_URL || 'https://zeekr-garage.dk';
}

// Kun interne stier tillades som redirect-maal (undgaar open-redirect).
export function sikkerSti(raw: string | null | undefined): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}
