import csv
import io
from email.message import EmailMessage
from typing import Any

import aiosmtplib

from app.config import get_settings


async def send_schedule_results(
    to_email: str,
    subject: str,
    body_text: str,
    columns: list[str],
    rows: list[dict[str, Any]],
) -> None:
    settings = get_settings()
    if not settings.smtp_configured:
        raise RuntimeError("SMTP is not configured (set SMTP_HOST and SMTP_FROM)")

    buf = io.StringIO()
    if columns and rows:
        w = csv.DictWriter(buf, fieldnames=columns, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in columns})

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.set_content(body_text + "\n\n--- CSV preview (first rows) ---\n" + buf.getvalue())

    use_tls = settings.smtp_port == 465
    start_tls = settings.smtp_port == 587
    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=settings.smtp_password or None,
        use_tls=use_tls,
        start_tls=start_tls,
    )
