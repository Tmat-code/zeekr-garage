'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import Avatar from '@/components/forum/Avatar';
import {
  AVATAR_BUCKET,
  AVATAR_PX,
  AVATAR_KVALITET,
  TILLADTE_TYPER,
  MAKS_BYTES,
  avatarUrl,
} from '@/lib/billeder';

// Profilbillede-upload (P22). Center-beskaerer + resizer billedet klient-side
// til et lille kvadrat (AVATAR_PX) foer upload - ingen crop-UI (laast med
// Torben 24-11). Uploader direkte til den offentlige 'avatar'-bucket med
// brugerens session (RLS: egen mappe), skriver path'en i profiles.avatar_path
// og fjerner best-effort den gamle fil (P9-sweepet rydder rester).
export default function AvatarUpload({
  initialPath,
  navn,
}: {
  initialPath: string | null;
  navn: string;
}) {
  const router = useRouter();
  const [path, setPath] = useState<string | null>(initialPath);
  const [busy, setBusy] = useState(false);
  const [fejl, setFejl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const url = path ? avatarUrl(path) : null;

  // Tegn et center-beskaeret kvadrat af billedet paa et AVATAR_PX-lærred og
  // giv en lille JPEG-blob tilbage.
  async function tilKvadratBlob(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_PX;
    canvas.height = AVATAR_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Kunne ikke behandle billedet.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_PX, AVATAR_PX);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, 'image/jpeg', AVATAR_KVALITET),
    );
    if (!blob) throw new Error('Kunne ikke behandle billedet.');
    return blob;
  }

  async function vaelg(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setFejl('');
    if (!TILLADTE_TYPER.includes(file.type)) return setFejl('Kun billeder (JPG, PNG, WebP, GIF).');
    if (file.size > MAKS_BYTES) return setFejl('Billedet er for stort (maks 5 MB).');

    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('Log ind for at skifte profilbillede.');

      const blob = await tilKvadratBlob(file);
      const nyPath = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await sb.storage
        .from(AVATAR_BUCKET)
        .upload(nyPath, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw new Error('Upload fejlede: ' + upErr.message);

      const { error: dbErr } = await sb
        .from('profiles')
        .update({ avatar_path: nyPath })
        .eq('id', user.id);
      if (dbErr) {
        // Ryd den netop uploadede fil igen, saa den ikke bliver foraeldreloes.
        await sb.storage.from(AVATAR_BUCKET).remove([nyPath]).catch(() => {});
        throw new Error(dbErr.message);
      }

      // Fjern den gamle fil (best-effort; P9-sweepet fanger rester).
      const gammel = path;
      if (gammel && gammel !== nyPath) {
        await sb.storage.from(AVATAR_BUCKET).remove([gammel]).catch(() => {});
      }
      setPath(nyPath);
      router.refresh();
    } catch (e: any) {
      setFejl(e?.message ?? 'Kunne ikke gemme billedet.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function fjern() {
    setFejl('');
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('Log ind for at fjerne profilbilledet.');

      const { error } = await sb.from('profiles').update({ avatar_path: null }).eq('id', user.id);
      if (error) throw new Error(error.message);

      const gammel = path;
      if (gammel) await sb.storage.from(AVATAR_BUCKET).remove([gammel]).catch(() => {});
      setPath(null);
      router.refresh();
    } catch (e: any) {
      setFejl(e?.message ?? 'Kunne ikke fjerne billedet.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kort mt-6 space-y-4 p-6">
      <div>
        <span className="label">Profilbillede</span>
        <div className="mt-2 flex items-center gap-4">
          <Avatar url={url} navn={navn || null} px={64} />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-ghost !py-1.5 text-sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              📷 {busy ? 'Arbejder…' : url ? 'Skift billede' : 'Tilføj billede'}
            </button>
            {url && (
              <button
                type="button"
                className="text-sm text-grafit-500 hover:text-kobber-700"
                disabled={busy}
                onClick={fjern}
              >
                Fjern
              </button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => vaelg(e.target.files)}
        />
      </div>
      <p className="text-xs text-grafit-500">
        Vises som dit ansigt på tråde, svar, kommentarer og beskeder. Billedet beskæres kvadratisk og
        gøres mindre automatisk. Har du intet billede, vises dit forbogstav.
      </p>
      {fejl && <p className="text-sm text-kobber-700">{fejl}</p>}
    </div>
  );
}
