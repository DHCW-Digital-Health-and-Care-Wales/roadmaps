"""S5 & D15: retention purge CLIs (`roadmaps-purge-transactions`, `roadmaps-purge-sessions`).

Verifies fail-closed CLI arguments and `ROADMAPS_*` environment handling, exact retention
windows (> 1 day past `expires_at` for transactions; > 30 days past ended time for
sessions), dedicated `roadmaps_purge` login execution, and allow-listed JSON log output.
"""

import subprocess
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

import psycopg
import pytest

from roadmaps_api.purge import sessions as purge_sessions
from roadmaps_api.purge import transactions as purge_transactions
from roadmaps_api.settings import (
    DATABASE_URL,
    ENV,
    MIGRATION_DATABASE_URL,
    PURGE_DATABASE_URL,
)
from tests import harness
from tests.support import PLANTED, Lines
from tools.seed.factories import (
    PersonInput,
    SessionInput,
    SignInTransactionInput,
    create_person_with_identity,
    create_session,
    create_sign_in_transaction,
)


def test_purge_clis_reject_arguments_missing_url_and_unexpected_roadmaps_env_vars(
    lines: Lines,
) -> None:
    for module in (purge_transactions, purge_sessions):
        assert module.main(["--days", "0"], environ={}) == 2
        [arg_line] = lines.read()
        assert arg_line["message"] == "purge.invalid_args"

        assert module.main([], environ={}) == 1
        [missing_line] = lines.read()
        assert missing_line["invalid_settings"] == [PURGE_DATABASE_URL]

        assert module.main([], environ={PURGE_DATABASE_URL: f"mysql://{PLANTED}"}) == 1
        [bad_url_line] = lines.read()
        assert bad_url_line["invalid_settings"] == [PURGE_DATABASE_URL]

        valid_url = "postgresql+psycopg://roadmaps_purge_login:roadmaps@127.0.0.1:1/roadmaps"
        unexpected_env = {
            PURGE_DATABASE_URL: valid_url,
            DATABASE_URL: f"postgresql+psycopg://u:{PLANTED}@127.0.0.1:1/roadmaps",
            MIGRATION_DATABASE_URL: f"postgresql+psycopg://m:{PLANTED}@127.0.0.1:1/roadmaps",
            ENV: PLANTED,
            "ROADMAPS_UNEXPECTED": PLANTED,
        }
        assert module.main([], environ=unexpected_env) == 1
        [unexpected_line] = lines.read()
        assert set(unexpected_line["invalid_settings"]) == {
            DATABASE_URL,
            MIGRATION_DATABASE_URL,
            ENV,
            "ROADMAPS_UNEXPECTED",
        }


def test_purge_cli_logs_database_failure_type_without_message(lines: Lines) -> None:
    down = f"postgresql+psycopg://roadmaps_purge_login:{PLANTED}@127.0.0.1:1/roadmaps"
    assert purge_transactions.main([], environ={PURGE_DATABASE_URL: down}) == 1
    [failed_line] = lines.read()
    assert failed_line["message"] == "purge.failed"
    assert failed_line["table"] == "sign_in_transactions"
    assert failed_line["exception_type"] == "sqlalchemy.exc.OperationalError"
    assert "exception_message" not in failed_line


@pytest.mark.usefixtures("database_url")
def test_purge_transactions_removes_only_rows_expired_over_one_day_ago(
    worker_database: str,
    worker_admin: psycopg.Connection,
    lines: Lines,
) -> None:
    now = datetime.now(UTC)
    with harness.admin_session(worker_database) as session:
        old_expired = create_sign_in_transaction(
            session,
            SignInTransactionInput(
                raw_state="tx-old-expired",
                raw_cookie_token="cookie-old-expired",  # noqa: S106 - test fixture
                nonce="n1",
                code_verifier="v1",
                created_at=now - timedelta(days=2, minutes=10),
                expires_at=now - timedelta(days=2),
            ),
        )
        recent_expired = create_sign_in_transaction(
            session,
            SignInTransactionInput(
                raw_state="tx-recent-expired",
                raw_cookie_token="cookie-recent-expired",  # noqa: S106 - test fixture
                nonce="n2",
                code_verifier="v2",
                created_at=now - timedelta(hours=12, minutes=10),
                expires_at=now - timedelta(hours=12),
            ),
        )
        active = create_sign_in_transaction(
            session,
            SignInTransactionInput(
                raw_state="tx-active",
                raw_cookie_token="cookie-active",  # noqa: S106 - test fixture
                nonce="n3",
                code_verifier="v3",
                created_at=now,
                expires_at=now + timedelta(minutes=10),
            ),
        )
        keep_ids = {recent_expired.id, active.id}
        old_id = old_expired.id
        session.commit()

    rc = purge_transactions.main(
        [], environ={PURGE_DATABASE_URL: harness.purge_url(worker_database)}
    )
    assert rc == 0
    [done_line] = lines.read()
    assert done_line["message"] == "purge.done"
    assert done_line["table"] == "sign_in_transactions"
    assert done_line["deleted_count"] == 1

    remaining = {
        row[0]
        for row in worker_admin.execute("SELECT id FROM public.sign_in_transactions").fetchall()
    }
    assert remaining == keep_ids
    assert old_id not in remaining


@pytest.mark.usefixtures("database_url")
def test_purge_sessions_removes_only_sessions_ended_over_thirty_days_ago(
    worker_database: str,
    worker_admin: psycopg.Connection,
    lines: Lines,
) -> None:
    now = datetime.now(UTC)
    with harness.admin_session(worker_database) as session:
        person, identity = create_person_with_identity(
            session,
            PersonInput(
                display_name="Purge Subject",
                email="purge@dhcw.example",
                subject="purge-sub",
                created_at=now - timedelta(days=60),
            ),
        )
        revoked_old = create_session(
            session,
            SessionInput(
                person_id=person.id,
                identity_id=identity.id,
                raw_token="sess-revoked-old",  # noqa: S106 - test fixture
                signed_in_at=now - timedelta(days=31, hours=1),
                revoked_at=now - timedelta(days=31),
            ),
        )
        idle_expired_old = create_session(
            session,
            SessionInput(
                person_id=person.id,
                identity_id=identity.id,
                raw_token="sess-idle-old",  # noqa: S106 - test fixture
                signed_in_at=now - timedelta(days=31, hours=2),
                idle_expires_at=now - timedelta(days=31, hours=1),
                absolute_expires_at=now - timedelta(days=30, hours=16),
            ),
        )
        # Ended < 30 days ago (must be kept).
        revoked_recent = create_session(
            session,
            SessionInput(
                person_id=person.id,
                identity_id=identity.id,
                raw_token="sess-revoked-recent",  # noqa: S106 - test fixture
                signed_in_at=now - timedelta(days=10, hours=1),
                revoked_at=now - timedelta(days=10),
            ),
        )
        # Active session (must be kept).
        active = create_session(
            session,
            SessionInput(
                person_id=person.id,
                identity_id=identity.id,
                raw_token="sess-active",  # noqa: S106 - test fixture
                signed_in_at=now,
            ),
        )
        # Old ended session still referenced by an unpurged link transaction (skipped safely).
        referenced_old = create_session(
            session,
            SessionInput(
                person_id=person.id,
                identity_id=identity.id,
                raw_token="sess-referenced-old",  # noqa: S106 - test fixture
                signed_in_at=now - timedelta(days=35, hours=1),
                revoked_at=now - timedelta(days=35),
            ),
        )
        create_sign_in_transaction(
            session,
            SignInTransactionInput(
                raw_state="tx-link-ref",
                raw_cookie_token="cookie-link-ref",  # noqa: S106 - test fixture
                nonce="n-link",
                code_verifier="v-link",
                purpose="link",
                initiating_session_id=referenced_old.id,
                initiating_person_id=person.id,
                created_at=now,
                expires_at=now + timedelta(minutes=10),
            ),
        )
        keep_ids = {revoked_recent.id, active.id, referenced_old.id}
        deleted_ids = {revoked_old.id, idle_expired_old.id}
        session.commit()

    # Confirm seeded session count before running the purge job under roadmaps_purge.
    assert worker_admin.execute("SELECT count(*) FROM public.sessions").fetchone() == (5,)
    rc = purge_sessions.main([], environ={PURGE_DATABASE_URL: harness.purge_url(worker_database)})
    assert rc == 0
    [done_line] = lines.read()
    assert done_line["message"] == "purge.done"
    assert done_line["table"] == "sessions"
    assert done_line["deleted_count"] == 2

    remaining = {
        row[0] for row in worker_admin.execute("SELECT id FROM public.sessions").fetchall()
    }
    assert remaining == keep_ids
    assert deleted_ids.isdisjoint(remaining)


@pytest.mark.usefixtures("database_url")
@pytest.mark.parametrize("script_name", ["roadmaps-purge-transactions", "roadmaps-purge-sessions"])
def test_purge_console_scripts_run_and_refuse_unexpected_args(
    worker_database: str, script_name: str
) -> None:
    """Smoke-checks `[project.scripts]` entrypoints in `.venv/bin/` (D15)."""
    binary = Path(sys.executable).parent / script_name
    env = {"ROADMAPS_PURGE_DATABASE_URL": harness.purge_url(worker_database)}
    ok = subprocess.run(  # noqa: S603 - repo venv console script
        [str(binary)], env=env, capture_output=True, text=True, check=False, timeout=30
    )
    assert ok.returncode == 0, ok.stderr

    bad = subprocess.run(  # noqa: S603 - repo venv console script
        [str(binary), "--unexpected"],
        env=env,
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )
    assert bad.returncode == 2
