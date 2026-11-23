# STY-100: The API traces its requests, and a developer reads them in a local Jaeger

- **Status**: Placeholder — split from STY-090 (owner, 2026-11-23, STY-090 D24);
  promoted once its acceptance criteria are written
- **Type**: Feature
- **Area**: API
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-090 (hard)
- **Binding ADRs**: ADR-017 §Operation
- **Suggested model**: Sonnet — instrumentation with known libraries on STY-090's
  conventions

## Summary

The API sends OpenTelemetry traces, as ADR-017 sets, right after the skeleton (ADR-017
_STY-090 amendments_). A developer who
wants them starts one Jaeger shared by every worktree and reads each request's spans
there. Tests and CI export nothing. STY-090's request ID becomes the trace ID, so a log
line, an `X-Request-ID` header and a trace all name the same request. It does not
block STY-091 or STY-092.

## Why this is a placeholder

The owner split it from STY-090 (STY-090 D24) with its shape agreed, but its acceptance criteria
are not yet written.

## Rough shape of the work

_Not acceptance criteria._

- OpenTelemetry for FastAPI and SQLAlchemy, with each log line carrying the trace ID;
  STY-090's `X-Request-ID` becomes equal to it (STY-090 D26).
- One shared, opt-in Jaeger: `pnpm api:jaeger` starts one container, its image pinned
  by digest, on fixed ports bound to 127.0.0.1 (UI 16686, OTLP 4318) for every worktree, and each API names its service with its slot
  (`roadmaps-api-31`). `api:dev` exports only when Jaeger answers or
  `OTEL_EXPORTER_OTLP_ENDPOINT` is set; no slot ports are added (owner, 2026-11-23,
  STY-090 grilling round 4).
- Probes that succeed make no span (STY-090 D20); tests and CI export nothing
  (ADR-017).
- Open for its criteria (STY-090's security review): whether an inbound `traceparent`
  is honoured, and from whom, since OpenTelemetry's default propagators take it from any
  caller and the trace ID becomes the request ID.
