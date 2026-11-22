// Forum-billeder i selvhostet Supabase Storage (bucket 'forum', public read).
export const FORUM_BUCKET = 'forum';

// Den offentlige URL skal nås fra browseren -> brug den offentlige Supabase-URL.
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// path (fx "<user_id>/<uuid>.jpg") -> offentlig billed-URL.
export function forumBilledeUrl(path: string): string {
  return `${BASE}/storage/v1/object/public/${FORUM_BUCKET}/${path}`;
}

// Tilladte typer + maks-størrelse (skal matche bucket-reglerne i migrationen).
export const TILLADTE_TYPER = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAKS_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAKS_ANTAL = 6; // billeder pr. indlæg
