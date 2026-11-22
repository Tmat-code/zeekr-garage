// Typografisk model-badge til forum-ikoner.
// I stedet for et generisk bil-emoji viser model-foraene selve betegnelsen
// (9X, 001, 001S, X, 7X, 7GT) - som et trim-mærke. Ren, automotive, ingen farvelade.
//
// Regel: fjern "zeekr-" foran, og lav hvert ord efter det foerste om til
// sit forbogstav. Saa foelger nye modeller automatisk med.
//   zeekr-9x         -> 9X
//   zeekr-001        -> 001
//   zeekr-001-sport  -> 001S
//   zeekr-x          -> X
//   zeekr-7gt        -> 7GT
export function modelBadge(slug: string): string {
  const base = slug.replace(/^zeekr-/i, '');
  const [head, ...rest] = base.split('-');
  const suffix = rest.map((p) => p.charAt(0).toUpperCase()).join('');
  return head.toUpperCase() + suffix;
}
