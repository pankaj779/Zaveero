FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libffi-dev nodejs npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY prisma ./prisma
COPY app ./app
COPY scripts ./scripts
RUN prisma generate

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
