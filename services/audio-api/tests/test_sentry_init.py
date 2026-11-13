from sentry_init import init_sentry, resolve_environment, resolve_release


def test_init_is_skipped_without_dsn(monkeypatch) -> None:
    monkeypatch.delenv("SENTRY_DSN", raising=False)
    assert init_sentry() is False


def test_release_prefers_sentry_release_then_git_sha_then_revision(monkeypatch) -> None:
    monkeypatch.delenv("SENTRY_RELEASE", raising=False)
    monkeypatch.delenv("GIT_SHA", raising=False)
    monkeypatch.setenv("K_REVISION", "rev-from-cloud-run")
    assert resolve_release() == "rev-from-cloud-run"

    monkeypatch.setenv("GIT_SHA", "abc123")
    assert resolve_release() == "abc123"

    monkeypatch.setenv("SENTRY_RELEASE", "release-1")
    assert resolve_release() == "release-1"


def test_environment_uses_k_service_as_production_fallback(monkeypatch) -> None:
    monkeypatch.delenv("SENTRY_ENVIRONMENT", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("K_SERVICE", raising=False)
    assert resolve_environment() == "development"

    monkeypatch.setenv("K_SERVICE", "musaix-audio-api")
    assert resolve_environment() == "production"

    monkeypatch.setenv("SENTRY_ENVIRONMENT", "staging")
    assert resolve_environment() == "staging"
