"""
arq worker entrypoint.

Run with::

    python -m app.worker            # uses get_worker_settings()
    # or, equivalently:
    arq app.worker.WorkerSettings

The Docker `worker` service uses the first form so it inherits the same image
and env vars as the API.
"""

from __future__ import annotations

import logging

from app.services.jobs import get_worker_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

WorkerSettings = get_worker_settings()


def main() -> None:
    from arq.worker import run_worker  # type: ignore

    run_worker(WorkerSettings)


if __name__ == "__main__":
    main()
