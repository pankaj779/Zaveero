FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libffi-dev nodejs npm postgresql-client git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY prisma ./prisma
COPY app ./app
COPY sql ./sql
COPY render-entrypoint.sh ./render-entrypoint.sh

RUN prisma generate \
    && cp /app/render-entrypoint.sh /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
