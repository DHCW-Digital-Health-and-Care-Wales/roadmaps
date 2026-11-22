import { setupServer } from "msw/node"

// Shared MSW server. Tests register handlers with `server.use(...)`, importing `http`
// from `msw/http`; any request without a handler fails the test (see setup.ts).
// To fall through to the next handler, return `undefined`: `passthrough()` sends the
// request to the real network. A `:batchUpdate` path needs a RegExp matcher.
export const server = setupServer()
