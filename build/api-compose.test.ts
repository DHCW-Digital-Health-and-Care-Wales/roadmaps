import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"
import { parse } from "yaml"

/**
 * The API's local database (apps/api/compose.yaml), which CI's API job starts too, is
 * reachable only from this machine.
 */
const ROOT = join(import.meta.dirname, "..")

interface Service {
  ports?: (string | { host_ip?: string })[]
}

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
}

const compose = parse(read("apps/api/compose.yaml")) as {
  services: Record<string, Service>
}
const services = Object.values(compose.services)

describe("apps/api/compose.yaml", () => {
  it("binds every published port to 127.0.0.1", () => {
    const ports = services.flatMap((service) => service.ports ?? [])

    expect(ports).not.toEqual([])
    for (const port of ports) {
      const hostIp =
        typeof port === "string" ? port.split(":")[0] : port.host_ip
      expect(hostIp, `bind ${JSON.stringify(port)} to 127.0.0.1`).toBe(
        "127.0.0.1",
      )
    }
  })
})
