# NLLB-600M oversaetter-service (Zeekr Garage rapport, trin 2)

Lille, selvhostet HTTP-oversaetter til **rapporten** (ikke forummet). Bedre kvalitet
end LibreTranslate paa rapportens fagsprog. Motor-agnostisk kontrakt, saa den er
drop-in bag term-/rensnings-laget i `lib/oversaet.ts`.

## Kontrakt

```
POST /translate
{ "q": "..." | ["...", "..."], "source": "dan_Latn", "target": "eng_Latn" }
-> { "translatedText": ["..."] }

GET /health -> { "status": "ok", "model": "...", "indlaest": true|false }
```

`source`/`target` er **FLORES-200-koder**: `dan_Latn` (dansk), `eng_Latn` (engelsk),
`swe_Latn` (svensk). App-siden mapper da/en/sv til dem.

## On-demand + Pixa-venlig

- **CPU-only**, faa traade (`NLLB_THREADS`, default 2) - live-siderne beholder CPU.
- Modellen loades **on-demand** ved foerste oversaettelse, ikke ved opstart.
- **Idle-unload** (`NLLB_IDLE_UNLOAD_S`, default 600s): modellen frigives fra RAM
  efter inaktivitet (de ~2,5 GB staar aldrig og fylder i hvile).
- Model-cachen ligger i volumen `/models` (overlever genstart/idle-unload; kun RAM
  frigives ved idle, ikke disken).

## Deploy i Coolify (Pixa)

1. Ny ressource -> byg fra Git (repo `Tmat-code/zeekr-garage`), **Base Directory**
   `nllb-service`, build pack **Dockerfile**.
2. Persistent volume -> mount path `/models` (model-cache).
3. Ingen offentlig domaene-exposure noedvendig - kun internt paa Pixas Docker-net.
4. (Anbefalet) saet en **memory-limit** paa containeren (fx 3,5 GB) saa den aldrig
   kan vaelte boksen; OOM-kill under et kald er ok (appen falder tilbage til
   LibreTranslate).
5. Saet app-env `NLLB_URL` til servicens interne adresse (fx
   `http://<coolify-service-navn>:8000`) **foerst naar /health svarer**.

## Env

| Variabel | Default | Betydning |
|---|---|---|
| `NLLB_MODEL` | `facebook/nllb-200-distilled-600M` | model-id |
| `NLLB_THREADS` | `2` | torch CPU-traade |
| `NLLB_IDLE_UNLOAD_S` | `600` | sekunder idle foer RAM-frigivelse (0 = aldrig) |
| `NLLB_BATCH` | `8` | tekster pr. generate-batch |
| `NLLB_MAX_LEN` | `512` | max tokens ind/ud |
| `PORT` | `8000` | lyt-port |

## Lokal test

```
pip install -r requirements.txt
python app.py
curl -s localhost:8000/translate -H 'content-type: application/json' \
  -d '{"q":"Bilen bremser pludseligt i bakgear.","source":"dan_Latn","target":"eng_Latn"}'
```
