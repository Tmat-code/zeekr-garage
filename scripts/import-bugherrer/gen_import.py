import sqlite3, sys, json, collections

db = sys.argv[1]
out = sys.argv[2]
con = sqlite3.connect(db)
con.row_factory = sqlite3.Row
cur = con.cursor()

STATUS = {
    'Undersøges': 'ny',
    'Bekræftet': 'bekraeftet',
    'Sendt til Zeekr': 'sendt_til_zeekr',
    'Løst!': 'loest_i_ota',
    'Løst': 'loest_i_ota',
}
MODEL_SLUG = {
    'Zeekr 9X': 'zeekr-9x', 'Zeekr 7X': 'zeekr-7x', 'Zeekr 7GT': 'zeekr-7gt',
    'Zeekr 001': 'zeekr-001', 'Zeekr 001 Sport Edition': 'zeekr-001-sport',
    'Zeekr 001 Sportudgave': 'zeekr-001-sport', 'Zeekr X': 'zeekr-x',
}


def q(s):
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"


def ts(s):
    return 'NULL' if not s else "'" + str(s) + "+00'"


# variant-fordeling pr. fejl (kun hvor ejer_variant ikke er NULL)
variant_pr_fejl = collections.defaultdict(collections.Counter)
for r in cur.execute("select fejl_id, ejer_variant from stemmer_log where ejer_variant is not null"):
    variant_pr_fejl[r['fejl_id']][r['ejer_variant']] += 1

fejl = list(cur.execute("select * from fejl order by id"))
komm = list(cur.execute("select * from kommentarer order by id"))

L = []
L.append("-- Import fra bugherrer → zeekr-garage (genereret). Idempotent: kør igen for friskt snapshot.")
L.append("-- Forudsætter legacy-migrationen (20261120210000_legacy_import.sql).")
L.append("begin;")
L.append("")

# ---- Meldinger (upsert) ----
L.append("-- 1) Meldinger")
rows = []
for f in fejl:
    biler = [{'variant': v, 'n': n} for v, n in variant_pr_fejl[f['id']].most_common()]
    biler_json = json.dumps(biler, ensure_ascii=False)
    typ = f['type'] if f['type'] in ('fejl', 'oenske') else 'fejl'
    status = STATUS.get(f['status'], 'ny')
    rows.append(
        f"({f['id']}, {q(typ)}, {q(f['titel'])}, {q(f['beskrivelse'])}, {q(status)}, "
        f"{q(f['softwareversion'])}, {q(f['telefon'])}, {q(f['telefon_os'])}, "
        f"{ts(f['oprettet'])}, {int(f['stemmer'] or 0)}, {q(biler_json)}::jsonb)"
    )
L.append(
    "insert into public.issues "
    "(legacy_bugherrer_id, type, title, description, status, software_version, phone_model, phone_os, created_at, legacy_stemmer, legacy_biler)\nvalues"
)
L.append(",\n".join(rows))
L.append(
    "on conflict (legacy_bugherrer_id) where legacy_bugherrer_id is not null do update set\n"
    "  type = excluded.type, title = excluded.title, description = excluded.description,\n"
    "  status = excluded.status, software_version = excluded.software_version,\n"
    "  phone_model = excluded.phone_model, phone_os = excluded.phone_os,\n"
    "  legacy_stemmer = excluded.legacy_stemmer, legacy_biler = excluded.legacy_biler;"
)
L.append("")

# ---- Model-koblinger ----
L.append("-- 2) Model-koblinger")
for f in fejl:
    slug = MODEL_SLUG.get(f['bilmodel'], 'zeekr-7gt')
    L.append(
        f"insert into public.issue_models (issue_id, model_id) "
        f"select i.id, m.id from public.issues i cross join public.models m "
        f"where i.legacy_bugherrer_id = {f['id']} and m.slug = {q(slug)} on conflict do nothing;"
    )
L.append("")

# ---- Kommentarer (ryd importerede, genindsæt) ----
L.append("-- 3) Kommentarer: ryd tidligere importerede (author_id null) og genindsæt")
L.append(
    "delete from public.comments where author_id is null "
    "and issue_id in (select id from public.issues where legacy_bugherrer_id is not null);"
)
# is_solution: fejl.loesning_kommentar_id peger på kommentarens id
loesning = {f['id']: f['loesning_kommentar_id'] for f in fejl}
for k in komm:
    er_loesning = 'true' if loesning.get(k['fejl_id']) == k['id'] else 'false'
    L.append(
        f"insert into public.comments (issue_id, author_navn, body, is_solution, created_at)\n"
        f"select i.id, {q(k['navn'])}, {q(k['tekst'])}, {er_loesning}, {ts(k['oprettet'])}\n"
        f"from public.issues i where i.legacy_bugherrer_id = {k['fejl_id']};"
    )
L.append("")
L.append("commit;")
L.append("")
L.append(f"-- {len(fejl)} meldinger, {sum(len(v) for v in variant_pr_fejl.values())} variant-grupper, {len(komm)} kommentarer")

with open(out, 'w', encoding='utf-8') as fh:
    fh.write("\n".join(L))

print(f"Skrev {out}")
print(f"  meldinger: {len(fejl)}  kommentarer: {len(komm)}")
print(f"  statusser brugt: {set(STATUS.get(f['status'],'ny') for f in fejl)}")
print(f"  ukendte statusser: {set(f['status'] for f in fejl if f['status'] not in STATUS)}")
print(f"  ukendte bilmodeller: {set(f['bilmodel'] for f in fejl if f['bilmodel'] not in MODEL_SLUG)}")
con.close()
