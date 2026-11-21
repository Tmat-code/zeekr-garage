# Import af bugherrer-data → zeekr-garage

Re-kørbar import (upsert på `legacy_bugherrer_id`). Bugherrer forbliver kilde
indtil cutover; kør igen for et friskt snapshot.

## Trin
1. På Pixa: find bugherrer-containeren og kopiér dens data ud:
   ```
   docker cp <bugherrer-container>:/app/data ~/bugherrer-data
   tar czf ~/bugherrer-data.tgz -C ~/bugherrer-data .
   ```
   (DB-filen hedder `bugherrer.db`, WAL-mode - tag hele mappen med.)
2. Pak ud og generér import-SQL:
   ```
   python3 -I gen_import.py /sti/til/bugherrer.db ../../supabase/imports/bugherrer_import.sql
   ```
3. Kør FØRST legacy-migrationen `supabase/migrations/20261120210000_legacy_import.sql`
   i Supabase Studio, DEREFTER den genererede `bugherrer_import.sql`.

Den genererede SQL er gitignoreret (indeholder rigtige brugernavne/kommentarer).
