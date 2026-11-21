// Absolut dato + tid i dansk tid (til events). null => "Dato kommer".
export function datoTid(iso: string | null): string {
  if (!iso) return 'Dato kommer';
  return new Date(iso).toLocaleString('da-DK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Copenhagen',
  });
}

// Relativ dansk tidsangivelse ("3t siden", "i gaar", "2 uger siden").
export function relativTid(iso: string): string {
  const da = new Date(iso);
  const nu = Date.now();
  const sek = Math.max(0, Math.floor((nu - da.getTime()) / 1000));

  if (sek < 60) return 'lige nu';
  const min = Math.floor(sek / 60);
  if (min < 60) return `${min}m siden`;
  const timer = Math.floor(min / 60);
  if (timer < 24) return `${timer}t siden`;
  const dage = Math.floor(timer / 24);
  if (dage === 1) return 'i går';
  if (dage < 7) return `${dage} dage siden`;
  const uger = Math.floor(dage / 7);
  if (uger < 5) return `${uger} ${uger === 1 ? 'uge' : 'uger'} siden`;
  const maaneder = Math.floor(dage / 30);
  if (maaneder < 12) return `${maaneder} ${maaneder === 1 ? 'måned' : 'måneder'} siden`;
  const aar = Math.floor(dage / 365);
  return `${aar} ${aar === 1 ? 'år' : 'år'} siden`;
}
