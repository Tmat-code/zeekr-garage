# NLLB-600M on-demand oversaetter-service til Zeekr Garage-RAPPORTEN (trin 2,
# nordisk i18n). Lille HTTP-service: samme {q, source, target} -> {translatedText}
# kontrakt som LibreTranslate, saa de to motorer er ombyttelige i lib/oversaet.ts.
#
# Pixa-virkelighed: modest CPU-boks (Ryzen 5 3501U, ingen GPU) der baerer live
# produktion. Derfor:
#  - CPU-only, faa traade (NLLB_THREADS, default 2) saa live-siderne beholder CPU.
#  - Modellen loades ON-DEMAND ved foerste oversaettelse (ikke ved opstart), saa
#    servicen i hvile kun er en tom webserver (~0 model-RAM).
#  - Idle-unload (NLLB_IDLE_UNLOAD_S, default 600s): modellen smides ud af RAM naar
#    der ikke har vaeret kald laenge, saa de ~2,5 GB ikke staar og fylder.
#  - Ét globalt lock serialiserer load + inference + unload: aldrig to samtidige
#    model-loads (ingen 2x RAM-spike), og idle-reaper'en kan ikke rydde modellen
#    midt i en oversaettelse.
# Appen (lib/oversaet.ts) falder graceful tilbage til LibreTranslate hvis dette
# kald fejler, saa en langsom/daud service vaelter aldrig rapporten.

import gc
import os
import threading
import time

from flask import Flask, jsonify, request

MODEL = os.environ.get("NLLB_MODEL", "facebook/nllb-200-distilled-600M")
THREADS = int(os.environ.get("NLLB_THREADS", "2"))
IDLE_UNLOAD_S = int(os.environ.get("NLLB_IDLE_UNLOAD_S", "600"))
BATCH = int(os.environ.get("NLLB_BATCH", "8"))
MAX_LEN = int(os.environ.get("NLLB_MAX_LEN", "512"))

app = Flask(__name__)

_lock = threading.RLock()
_tok = None
_model = None
_last_used = 0.0
_torch = None  # importeres doven (tung import)


def _ensure_loaded():
    """Load tokenizer + model paa foerste brug. Holder _lock under hele loadet,
    saa to samtidige kald aldrig loader to kopier."""
    global _tok, _model, _last_used, _torch
    with _lock:
        if _model is None:
            import torch  # tung import - foerst naar vi faktisk skal bruge den
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

            torch.set_num_threads(THREADS)
            _torch = torch
            app.logger.info("NLLB: loader %s (CPU, %d traade) ...", MODEL, THREADS)
            t0 = time.time()
            _tok = AutoTokenizer.from_pretrained(MODEL)
            _model = AutoModelForSeq2SeqLM.from_pretrained(MODEL)
            _model.eval()
            app.logger.info("NLLB: klar paa %.1fs", time.time() - t0)
        _last_used = time.time()
        return _tok, _model


def _reaper():
    """Smider modellen ud af RAM efter IDLE_UNLOAD_S uden kald (0 = aldrig)."""
    global _tok, _model
    if IDLE_UNLOAD_S <= 0:
        return
    while True:
        time.sleep(60)
        with _lock:
            if _model is not None and (time.time() - _last_used) > IDLE_UNLOAD_S:
                app.logger.info("NLLB: idle i >%ds - frigiver modellen", IDLE_UNLOAD_S)
                _tok = None
                _model = None
                gc.collect()


threading.Thread(target=_reaper, daemon=True).start()


@app.get("/")
@app.get("/health")
def health():
    with _lock:
        indlaest = _model is not None
    return jsonify({"status": "ok", "model": MODEL, "indlaest": indlaest})


@app.post("/translate")
def translate():
    """{ q: str | str[], source: <FLORES>, target: <FLORES> } -> { translatedText: str[] }.
    source/target er FLORES-200-koder (dan_Latn / eng_Latn / swe_Latn) - app-siden
    mapper da/en/sv til dem, saa servicen bruger dem raat."""
    data = request.get_json(force=True, silent=True) or {}
    q = data.get("q")
    source = data.get("source")
    target = data.get("target")
    if q is None or not source or not target:
        return jsonify({"error": "q, source og target kraeves"}), 400

    tekster = [q] if isinstance(q, str) else [str(t) for t in q]
    if not tekster:
        return jsonify({"translatedText": []})

    try:
        tok, model = _ensure_loaded()
        # Serialisér inference under samme lock: bund RAM/CPU, og reaper'en kan
        # ikke frigive modellen midt i et kald.
        with _lock:
            torch = _torch
            tok.src_lang = source
            bos = tok.convert_tokens_to_ids(target)
            if bos is None or bos == tok.unk_token_id:
                return jsonify({"error": f"ukendt target-sprog {target}"}), 400
            ud = []
            for i in range(0, len(tekster), BATCH):
                chunk = tekster[i : i + BATCH]
                enc = tok(chunk, return_tensors="pt", padding=True, truncation=True, max_length=MAX_LEN)
                with torch.no_grad():
                    gen = model.generate(**enc, forced_bos_token_id=bos, max_length=MAX_LEN, num_beams=1)
                ud.extend(tok.batch_decode(gen, skip_special_tokens=True))
            global _last_used
            _last_used = time.time()
        return jsonify({"translatedText": ud})
    except Exception as e:  # noqa: BLE001 - app-siden falder tilbage til LibreTranslate
        app.logger.exception("NLLB oversaettelse fejlede")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Kun til lokal koersel; i containeren starter gunicorn appen (se Dockerfile).
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
