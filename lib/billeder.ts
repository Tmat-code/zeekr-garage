// Billeder i selvhostet Supabase Storage (public read-buckets).
// Forum-indlæg -> 'forum'-bucket. Feedback-meldinger (foto-bevis) -> 'meld'-bucket.
// Egne buckets holder oprydning + regler adskilt mellem de to spor.
export const FORUM_BUCKET = 'forum';
export const MELD_BUCKET = 'meld';

// Den offentlige URL skal nås fra browseren -> brug den offentlige Supabase-URL.
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// path (fx "<user_id>/<uuid>.jpg") + bucket -> offentlig billed-URL.
export function billedeUrl(bucket: string, path: string): string {
  return `${BASE}/storage/v1/object/public/${bucket}/${path}`;
}
export function forumBilledeUrl(path: string): string {
  return billedeUrl(FORUM_BUCKET, path);
}
export function meldBilledeUrl(path: string): string {
  return billedeUrl(MELD_BUCKET, path);
}

// Tilladte typer + maks-størrelse (skal matche bucket-reglerne i migrationen).
export const TILLADTE_TYPER = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAKS_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAKS_ANTAL = 6; // billeder pr. indlæg
