'use client';

import { useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import {
  FORUM_BUCKET,
  TILLADTE_TYPER,
  MAKS_BYTES,
  MAKS_ANTAL,
  forumBilledeUrl,
} from '@/lib/billeder';

type Item = { path: string; url: string };

// Billed-upload. Uploader direkte til Supabase Storage med brugerens session
// (RLS: egen mappe <user_id>/...) og giver forælderen de gemte paths via
// onChange. Visning sker via den offentlige URL.
// Standard = forum-bucketen; /meld sender bucket='meld' + egen urlFor, så
// samme komponent dækker begge spor uden at røre forum-opførslen.
export default function BilledeUpload({
  onChange,
  disabled,
  bucket = FORUM_BUCKET,
  urlFor = forumBilledeUrl,
  maksAntal = MAKS_ANTAL,
}: {
  onChange: (paths: string[]) => void;
  disabled?: boolean;
  bucket?: string;
  urlFor?: (path: string) => string;
  maksAntal?: number;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [uploader, setUploader] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function vaelg(files: FileList | null) {
    if (!files || files.length === 0) return;
    setFejl(null);
    setUploader(true);
    const sb = supabaseBrowser();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setFejl('Log ind for at uploade billeder.');
      setUploader(false);
      return;
    }

    const plads = maksAntal - items.length;
    const valgte = Array.from(files).slice(0, Math.max(0, plads));
    const nye: Item[] = [];
    for (const f of valgte) {
      if (!TILLADTE_TYPER.includes(f.type)) {
        setFejl('Kun billeder (JPG, PNG, WebP, GIF).');
        continue;
      }
      if (f.size > MAKS_BYTES) {
        setFejl('Billedet er for stort (maks 5 MB).');
        continue;
      }
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage
        .from(bucket)
        .upload(path, f, { contentType: f.type, upsert: false });
      if (error) {
        setFejl('Upload fejlede: ' + error.message);
        continue;
      }
      nye.push({ path, url: urlFor(path) });
    }

    const alle = [...items, ...nye];
    setItems(alle);
    onChange(alle.map((i) => i.path));
    setUploader(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function fjern(path: string) {
    // Best-effort: fjern den uploadede fil igen (indlægget er ikke oprettet endnu).
    try {
      await supabaseBrowser().storage.from(bucket).remove([path]);
    } catch {
      /* ignoreres - forældreløs fil kan ryddes senere */
    }
    const alle = items.filter((i) => i.path !== path);
    setItems(alle);
    onChange(alle.map((i) => i.path));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-ghost !py-1.5 text-sm"
          disabled={disabled || uploader || items.length >= maksAntal}
          onClick={() => inputRef.current?.click()}
        >
          📷 {uploader ? 'Uploader…' : 'Tilføj billede'}
        </button>
        <span className="text-xs text-grafit-400">
          {items.length}/{maksAntal} · maks 5 MB
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => vaelg(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((i) => (
            <div key={i.path} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={i.url}
                alt="Vedhæftet billede"
                className="h-16 w-16 rounded-lg border border-grafit-200 object-cover"
              />
              <button
                type="button"
                onClick={() => fjern(i.path)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-grafit-900 text-xs leading-none text-white"
                aria-label="Fjern billede"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {fejl && <p className="mt-1 text-sm text-kobber-700">{fejl}</p>}
    </div>
  );
}
