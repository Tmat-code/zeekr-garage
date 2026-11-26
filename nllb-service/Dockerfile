# NLLB-600M on-demand oversaetter-service (Zeekr Garage rapport, trin 2).
# CPU-only; modellen loades on-demand og caches i en persistent volume (/models).
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models \
    HF_HUB_DISABLE_TELEMETRY=1 \
    TRANSFORMERS_NO_ADVISORY_WARNINGS=1 \
    OMP_NUM_THREADS=2

WORKDIR /app

# CPU-only torch FOERST (fra PyTorch's CPU-index, undgaar den store CUDA-build),
# derefter resten fra PyPI (torch er dermed allerede opfyldt).
COPY requirements.txt .
RUN pip install --no-cache-dir torch==2.4.1 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Model-cachen lever her; monter en persistent volume saa downloaded model
# overlever genstart/idle-unload (idle-unload frigiver RAM, ikke disk).
VOLUME ["/models"]

EXPOSE 8000

# 1 worker => kun ÉN model i RAM. Lang timeout saa det foerste (model-load) kald
# ikke bliver draebt. gthread + 2 traade: appen serialiserer selv inference bag et
# lock, saa traadene er kun til health/samtidige lette kald.
CMD ["gunicorn", "-w", "1", "-k", "gthread", "--threads", "2", "-b", "0.0.0.0:8000", "--timeout", "300", "app:app"]
