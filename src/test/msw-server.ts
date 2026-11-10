import { setupServer } from "msw/node"

// Shared MSW server. Tests register handlers with `server.use(...)`; any request
// without a handler fails the test (see setup.ts).
export const server = setupServer()
