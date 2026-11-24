"""The composition root: builds the API from its settings."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.orm import sessionmaker
from starlette.middleware.body_limit import RequestBodyLimitMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from roadmaps_api.database import create_database_engine
from roadmaps_api.errors import register_error_handlers
from roadmaps_api.middleware import RequestContext
from roadmaps_api.routes import api_v1, probes
from roadmaps_api.settings import Settings, SettingsError, load_settings

logger = logging.getLogger(__name__)


def factory() -> FastAPI:
    """The API from the environment's settings, as uvicorn's factory, or exit 1.

    An exception left to uvicorn reaches the interpreter, or a reload worker's process,
    which prints it, with its text, on stderr; here it is logged as its type and frames.
    """
    # Python's warnings go to the JSON log, not to stderr with their text: set here, for
    # the process uvicorn runs, not in `create_app`, which tests and scripts call too.
    logging.captureWarnings(capture=True)
    try:
        return create_app(load_settings())
    except SettingsError:
        # load_settings has logged each bad setting's name.
        raise SystemExit(1) from None
    except Exception:
        logger.exception("app.failed")
        raise SystemExit(1) from None


def create_app(settings: Settings) -> FastAPI:
    engine = create_database_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
        yield
        engine.dispose()

    app = FastAPI(
        title="DHCW Roadmaps API",
        lifespan=lifespan,
        # No docs page anywhere, so the CSP holds unchanged; the live OpenAPI JSON
        # only locally, where the editor's dev server reaches it through its proxy.
        docs_url=None,
        redoc_url=None,
        openapi_url=f"{api_v1.router.prefix}/openapi.json"
        if settings.serves_live_openapi
        else None,
    )
    app.state.engine = engine
    app.state.sessions = sessionmaker(engine)
    register_error_handlers(app)
    app.include_router(probes.router)
    app.include_router(api_v1.router)
    # Added innermost first: a request meets RequestContext, then the Host allow-list,
    # then the body limit. Both answer in Starlette's plain text, not the envelope
    # (ADR-017 _Errors_). The limit counts a body as a route reads it: no route gets more
    # than the limit, the read stopping at the message that crosses it; a declared
    # oversize body is answered 413 once the route answers, and a streamed one a route
    # never reads gets the route's own answer (ADR-020).
    app.add_middleware(RequestBodyLimitMiddleware, max_body_size=settings.max_body_bytes)
    # The `Host` header only, never `X-Forwarded-Host`; no redirect to a `www.` name.
    app.add_middleware(
        TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts, www_redirect=False
    )
    app.add_middleware(RequestContext)
    return app
