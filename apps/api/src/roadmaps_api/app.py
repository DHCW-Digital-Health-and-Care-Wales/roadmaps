"""The composition root: builds the API from its settings."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.orm import sessionmaker

from roadmaps_api.database import create_database_engine
from roadmaps_api.errors import register_error_handlers
from roadmaps_api.middleware import BodyLimit, HostAllowList, RequestContext
from roadmaps_api.routes import api_v1, probes
from roadmaps_api.settings import Settings, SettingsError, load_settings

logger = logging.getLogger(__name__)


def factory() -> FastAPI:
    """The API from the environment's settings, as uvicorn's factory, or exit 1.

    An exception left to uvicorn reaches the interpreter, or a reload worker's process,
    which prints it, with its text, on stderr; here it is logged as its type and frames.
    """
    try:
        return create_app(load_settings())
    except SettingsError:
        # load_settings has logged each bad setting's name.
        raise SystemExit(1) from None
    except Exception:
        logger.exception("app.failed")
        raise SystemExit(1) from None


def create_app(settings: Settings) -> FastAPI:
    # Python's warnings go to the JSON log, not to stderr with their text.
    logging.captureWarnings(capture=True)
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
    # then the body limit.
    app.add_middleware(BodyLimit, max_bytes=settings.max_body_bytes)
    app.add_middleware(HostAllowList, allowed_hosts=settings.allowed_hosts)
    app.add_middleware(RequestContext)
    return app
