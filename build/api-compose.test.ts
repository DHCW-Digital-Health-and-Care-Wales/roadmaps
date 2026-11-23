import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"
import { parse } from "yaml"

/**
 * The API's local database (apps/api/compose.yaml) is reachable only from this machine,
 * and is the image CI's API job tests against, by the same digest.
 */
const ROOT = join(import.meta.dirname, "..")

interface Service {
  image?: string
  ports?: (string | { host_ip?: string })[]
}

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
}

const compose = parse(read("apps/api/compose.yaml")) as {
  services: Record<string, Service>
}
const workflow = parse(read(".github/workflows/ci.yml")) as {
  jobs: Record<string, { services?: Record<string, Service> }>
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

  it("pins each image by digest, the one CI's API job tests against", () => {
    const images = services.map((service) => service.image)
    const ciImages = Object.values(
      workflow.jobs["api-verify"]?.services ?? {},
    ).map((service) => service.image)

    expect(images).toHaveLength(1)
    expect(images[0]).toMatch(/^postgres:18@sha256:[0-9a-f]{64}$/)
    expect(
      ciImages,
      "Give api-verify's postgres service in .github/workflows/ci.yml the image of apps/api/compose.yaml.",
    ).toEqual(images)
  })
})
