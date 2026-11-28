#!/usr/bin/env node
// U4: render GoTrue-mailskabelonerne (bekræft + nulstil; U8: + mail-skift) og deres emner med den
// RIGTIGE Go html/template-motor - samme pakke og samme data-form som GoTrue
// (internal/mailer/templatemailer: "Data" = user.UserMetaData, map[string]any).
// Kræver `go` på PATH. Kør: node scripts/u4-mail-test.mjs [--emner]
//   --emner  udskriv kun emne-værdierne til Coolify (MAILER_SUBJECTS_*)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROD = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const jiti = createRequire(import.meta.url)('jiti')(new URL(import.meta.url).pathname, {
  alias: { '@': ROD },
  cache: false,
  requireCache: false,
});
const { goSkabelon, goEmne } = jiti(path.join(ROD, 'lib/mail-skabelon.ts'));
const { ORDBOGER } = jiti(path.join(ROD, 'lib/i18n/index.ts'));

if (process.argv.includes('--emner')) {
  console.log('MAILER_SUBJECTS_CONFIRMATION=' + goEmne('bekraeft'));
  console.log('MAILER_SUBJECTS_RECOVERY=' + goEmne('nulstil'));
  console.log('MAILER_SUBJECTS_EMAIL_CHANGE=' + goEmne('mailskift'));
  process.exit(0);
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'zg-mail-'));
const typer = ['bekraeft', 'nulstil', 'mailskift'];
for (const t of typer) {
  fs.writeFileSync(path.join(TMP, `${t}.body`), goSkabelon(t));
  fs.writeFileSync(path.join(TMP, `${t}.emne`), goEmne(t));
}

// Data-varianter: sv, en, da, intet sprog, nil-map, ukendt sprog, ikke-streng.
const GO = `package main

import (
	"bytes"
	"encoding/json"
	"html/template"
	"os"
	"path/filepath"
)

func main() {
	dir := os.Args[1]
	cases := map[string]map[string]interface{}{
		"sv":      {"sprog": "sv", "display_name": "Sven"},
		"en":      {"sprog": "en"},
		"da":      {"sprog": "da"},
		"intet":   {"display_name": "Gammel bruger"},
		"nilmap":  nil,
		"ukendt":  {"sprog": "<script>"},
		"tal":     {"sprog": 42},
	}
	ud := map[string]string{}
	for _, typ := range []string{"bekraeft", "nulstil", "mailskift"} {
		for _, del := range []string{"body", "emne"} {
			b, _ := os.ReadFile(filepath.Join(dir, typ+"."+del))
			tpl, err := template.New(typ + del).Parse(string(b))
			if err != nil {
				ud[typ+"/"+del+"/PARSEFEJL"] = err.Error()
				continue
			}
			for navn, data := range cases {
				var buf bytes.Buffer
				d := map[string]interface{}{
					"SiteURL":   "https://zeekr-garage.dk",
					"TokenHash": "abc123",
					"Email":     "x@y.dk",
					"Data":      data,
				}
				if err := tpl.Execute(&buf, d); err != nil {
					ud[typ+"/"+del+"/"+navn] = "EXECFEJL: " + err.Error()
				} else {
					ud[typ+"/"+del+"/"+navn] = buf.String()
				}
			}
		}
	}
	j, _ := json.Marshal(ud)
	os.Stdout.Write(j)
}
`;
fs.writeFileSync(path.join(TMP, 'main.go'), GO);
const res = JSON.parse(
  execFileSync('go', ['run', path.join(TMP, 'main.go'), TMP], {
    encoding: 'utf8',
    env: { ...process.env, GOFLAGS: '-mod=mod', GO111MODULE: 'off' },
  }),
);

let ok = 0;
let fejl = 0;
function tjek(navn, betingelse, info = '') {
  if (betingelse) ok++;
  else {
    fejl++;
    console.log(`FEJL  ${navn} ${info}`);
  }
}

for (const k of Object.keys(res)) tjek(`ingen parse/exec-fejl ${k}`, !/PARSEFEJL|EXECFEJL/.test(k + res[k]), res[k]);

const forventet = { sv: 'sv', en: 'en', da: 'da', intet: 'da', nilmap: 'da', ukendt: 'da', tal: 'da' };
for (const t of typer) {
  for (const [c, sp] of Object.entries(forventet)) {
    const body = res[`${t}/body/${c}`] ?? '';
    const emne = res[`${t}/emne/${c}`] ?? '';
    const m = ORDBOGER[sp].mail;
    tjek(`${t}/${c}: lang=${sp}`, body.includes(`<html lang="${sp}">`));
    tjek(`${t}/${c}: titel på ${sp}`, body.includes(`>${m[t].titel}</h2>`));
    tjek(`${t}/${c}: knap på ${sp}`, body.includes(m[t].knap));
    tjek(`${t}/${c}: kun ét dokument`, body.split('<!doctype html>').length === 2);
    tjek(`${t}/${c}: emne`, emne === m[t].emne, JSON.stringify(emne));
    const type = { bekraeft: 'signup', nulstil: 'recovery', mailskift: 'email_change' }[t];
    const naeste = { bekraeft: '/', nulstil: '/nulstil', mailskift: '/garage' }[t];
    if (m[t].note) tjek(`${t}/${c}: note på ${sp}`, body.includes(`>${m[t].note}</p>`));
    tjek(
      `${t}/${c}: link udfyldt`,
      body.includes(`href="https://zeekr-garage.dk/auth/confirm?token_hash=abc123&type=${type}&next=${naeste}"`),
    );
    tjek(`${t}/${c}: ingen ufyldte {{`, !body.includes('{{') && !emne.includes('{{'));
  }
  // Ukendt sprog-værdi lander aldrig i output (heller ikke escaped).
  tjek(`${t}: ukendt sprog ikke i output`, !res[`${t}/body/ukendt`].includes('script'));
  tjek(`${t}: emne uden $ og " (Compose/.env)`, !/[$"]/.test(fs.readFileSync(path.join(TMP, `${t}.emne`), 'utf8')));
}

// Dansk = byte-for-byte samme tekster som de gamle hardcodede skabeloner.
tjek('da bekræft titel uændret', res['bekraeft/body/da'].includes('<h2 style="margin:0 0 12px;font-size:20px;">Bekræft din konto</h2>'));
tjek('da nulstil knap uændret', res['nulstil/body/da'].includes('Vælg nyt password'));
// U8: mail-skift - dansk ordret som den gamle hardcodede skabelon.
for (const del of [
  '<h2 style="margin:0 0 12px;font-size:20px;">Bekræft din nye e-mail</h2>',
  '<p style="margin:0 0 18px;">Der er bedt om at skifte e-mailadressen på din Zeekr Garage-konto. Klik for at bekræfte:</p>',
  '<p style="margin:0 0 14px;color:#6b7280;font-size:13px;">Af sikkerhed sendes denne bekræftelse til både din nuværende og din nye adresse. Mailen skifter først når begge er bekræftet.</p>',
  '<p style="margin:0;color:#9ca3af;font-size:12px;">Har du ikke selv bedt om dette, så ignorér mailen - din adresse bliver ikke ændret.</p>',
]) tjek('da mail-skift uændret: ' + del.slice(-40), res['mailskift/body/da'].includes(del));
tjek('bekræft/nulstil har ingen note', !res['bekraeft/body/da'].includes('margin:0 0 14px') && !res['nulstil/body/sv'].includes('margin:0 0 14px'));

fs.writeFileSync(path.join(os.tmpdir(), 'zg-mail-sv-bekraeft.html'), res['bekraeft/body/sv']);
fs.writeFileSync(path.join(os.tmpdir(), 'zg-mail-en-nulstil.html'), res['nulstil/body/en']);
fs.writeFileSync(path.join(os.tmpdir(), 'zg-mail-sv-mailskift.html'), res['mailskift/body/sv']);
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${ok}/${ok + fejl} assertioner grønne.`);
process.exit(fejl ? 1 : 0);
