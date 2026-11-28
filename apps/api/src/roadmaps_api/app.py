"""The composition root: builds the API from its settings."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from opentelemetry.sdk.trace.export import SpanExporter
from starlette.middleware.body_limit import RequestBodyLimitMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from roadmaps_api.authz import PolicyAPIRoute, validate_shipped_roles, verify_app_routes
from roadmaps_api.database import create_database_engine, create_sessions
from roadmaps_api.errors import register_error_handlers
from roadmaps_api.identity import OidcClient, build_provider_configs
from roadmaps_api.middleware import RequestContext
from roadmaps_api.migrations import latest_revision
from roadmaps_api.openapi import document_refusals
from roadmaps_api.routes import api_v1, probes
from roadmaps_api.services.sessions import SessionService
from roadmaps_api.settings import Settings, SettingsError, load_settings
from roadmaps_api.tracing import INSTRUMENTATION, create_tracer_provider, trace_queries

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


def create_app(settings: Settings, *, span_exporter: SpanExporter | None = None) -> FastAPI:
    """The API; it never migrates its database, whose revision `/ready` reads.

    Its spans go to `span_exporter`, a test's, else to the settings' OTLP endpoint, if any.
    """
    validate_shipped_roles()
    oidc_client = OidcClient(build_provider_configs(settings))
    tracer_provider = create_tracer_provider(settings, span_exporter)
    tracer = tracer_provider.get_tracer(INSTRUMENTATION)
    engine = create_database_engine(settings.database_url)
    trace_queries(engine, tracer)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
        yield
        engine.dispose()
        # Exports the spans still held.
        tracer_provider.shutdown()

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
        # Off, whatever the environment holds: FastAPI's own spans carry the query string
        # and the path as sent, and it would export by OpenTelemetry's variables; the
        # API's spans are its own (`tracing`).
        telemetry={"tracing": False, "metrics": False, "logs": False, "auto_configure": False},
    )
    app.router.route_class = PolicyAPIRoute
    app.state.tracer = tracer
    app.state.engine = engine
    app.state.sessions = create_sessions(engine)
    app.state.editor_origin = settings.editor_origin
    app.state.session_cookie_name = settings.session_cookie_name
    app.state.transaction_cookie_prefix = settings.transaction_cookie_prefix
    app.state.oidc_client = oidc_client
    app.state.make_session_authenticator = SessionService
    app.state.serves_live_openapi = settings.serves_live_openapi
    # Read once, from the package's own migrations, for `/ready` to compare.
    app.state.latest_revision = latest_revision()
    register_error_handlers(app)
    app.include_router(probes.router)
    app.include_router(api_v1.router)
    verify_app_routes(app)
    document_refusals(app)
    # Added innermost first: a request meets RequestContext, then the Host allow-list,
    # then the body limit. Both answer in Starlette's plain text, not the envelope
    # (ADR-017 _Errors_). The limit counts a body as a route reads it: no route gets more
    # than the limit, the read stopping at the message that crosses it. A route that reads
    # no body runs first: a declared oversize body is answered 413 once it answers, and a
    # streamed one gets the route's own answer (ADR-020).
    app.add_middleware(RequestBodyLimitMiddleware, max_body_size=settings.max_body_bytes)
    # The `Host` header only, never `X-Forwarded-Host`; no redirect to a `www.` name.
    app.add_middleware(
        TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts, www_redirect=False
    )
    app.add_middleware(RequestContext, tracer=tracer)
    return app
