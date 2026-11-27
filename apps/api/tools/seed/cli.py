"""CLI entrypoint for `python -m tools.seed` (`pnpm api:seed`)."""

import argparse
import logging
import logging.config
import os
from collections.abc import Mapping, Sequence

from roadmaps_api.logs import log_config
from roadmaps_api.settings import SettingsError
from tools.seed.deterministic import DEFAULT_SEED
from tools.seed.guards import validated_admin_url
from tools.seed.seeder import SeedResult, run_seed

logger = logging.getLogger("roadmaps_api.seed")


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python -m tools.seed",
        description="Truncate and deterministically seed the local Roadmaps API database.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_SEED,
        help=f"Deterministic seed integer (default: {DEFAULT_SEED}).",
    )
    return parser.parse_args(argv)


def format_summary(result: SeedResult) -> str:
    """Formats the concise local-only summary printed to stdout (never to structured logs)."""
    header = (
        f"Seeded local database (seed={result.seed},"
        f" generated_members={result.generated_member_count})"
    )
    lines = [
        header,
        "Tenants:",
        *(
            f"  - {tenant.slug}: {tenant.name_en} / {tenant.name_cy} ({tenant.id})"
            for tenant in result.tenants
        ),
        "Local mock personas:",
        *(
            f"  - {persona.display_name} <{persona.email}>"
            f" subject={persona.subject} [{', '.join(persona.summary_roles)}]"
            for persona in result.personas
        ),
        "Pending invitations (local test tokens):",
        *(
            f"  - {inv.tenant_slug} ({inv.role_key.value}) <{inv.email}>"
            f" token={inv.raw_token} expires={inv.expires_at.isoformat()}"
            for inv in result.invitations
            if inv.status == "pending"
        ),
    ]
    return "\n".join(lines)


def main(
    argv: Sequence[str] | None = None,
    environ: Mapping[str, str] | None = None,
) -> int:
    # settings=None => messages=False: no admin URL, secret or raw exception message is logged.
    logging.config.dictConfig(log_config())
    args = parse_args(argv)
    env = os.environ if environ is None else environ
    try:
        url = validated_admin_url(env)
        result = run_seed(url, seed=args.seed, environ=env)
    except SettingsError:
        return 1
    except Exception:
        logger.exception("seed.failed")
        return 1
    logger.info("seed.done")
    print(format_summary(result))  # noqa: T201 - local developer summary on stdout (S3)
    return 0
