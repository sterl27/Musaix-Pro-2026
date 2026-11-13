from __future__ import annotations

import os


def resolve_release() -> str | None:
    return _first_non_empty(os.getenv("SENTRY_RELEASE"), os.getenv("GIT_SHA"), os.getenv("K_REVISION"))


def resolve_environment() -> str:
    return (
        _first_non_empty(os.getenv("SENTRY_ENVIRONMENT"), os.getenv("ENVIRONMENT"))
        or ("production" if os.getenv("K_SERVICE") else "development")
    )


def init_sentry() -> bool:
    dsn = (os.getenv("SENTRY_DSN") or "").strip()
    if not dsn:
        return False

    import sentry_sdk

    sentry_sdk.init(
        dsn=dsn,
        send_default_pii=False,
        traces_sample_rate=0.1,
        environment=resolve_environment(),
        release=resolve_release(),
    )
    return True


def _first_non_empty(*values: str | None) -> str | None:
    for value in values:
        if value and value.strip():
            return value.strip()
    return None
