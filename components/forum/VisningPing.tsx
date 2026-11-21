'use client';

import { useEffect, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Tæller en visning — kun fra rigtige browsere (ikke SSR/crawlere, som ikke kører JS).
// Best-effort: fejler den, sker der ingenting.
export default function VisningPing({ threadId }: { threadId: string }) {
  const sendt = useRef(false);
  useEffect(() => {
    if (sendt.current) return;
    sendt.current = true;
    (async () => {
      try {
        await supabaseBrowser().rpc('bump_thread_view', { t: threadId });
      } catch {
        /* best-effort — en manglende visning gør ingenting */
      }
    })();
  }, [threadId]);
  return null;
}
