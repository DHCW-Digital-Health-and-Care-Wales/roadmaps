import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"
import { parse } from "yaml"

/**
 * The API's local containers are reachable only from this machine, and their images are
 * pinned by digest: its database (apps/api/compose.yaml), which CI's API job starts
 * too, and the Jaeger every worktree shares (apps/api/jaeger/compose.yaml), which keeps
 * traces in memory alone.
 */
const ROOT = join(import.meta.dirname, "..")

interface Service {
  image?: string
  ports?: (string | { host_ip?: string })[]
  command?: string[]
  volumes?: unknown[]
  tmpfs?: string[]
}

function services(path: string): Service[] {
  const compose = parse(readFileSync(join(ROOT, path), "utf8")) as {
    services: Record<string, Service>
  }
  return Object.values(compose.services)
}

describe.each(["apps/api/compose.yaml", "apps/api/jaeger/compose.yaml"])(
  "%s",
  (path) => {
    it("binds every published port to 127.0.0.1", () => {
      const ports = services(path).flatMap((service) => service.ports ?? [])

      expect(ports).not.toEqual([])
      for (const port of ports) {
        const hostIp =
          typeof port === "string" ? port.split(":")[0] : port.host_ip
        expect(hostIp, `bind ${JSON.stringify(port)} to 127.0.0.1`).toBe(
          "127.0.0.1",
        )
      }
    })

    it("pins each image by digest", () => {
      const images = services(path).map((service) => service.image)

      expect(images).not.toEqual([])
      for (const image of images) {
        expect(
          image,
          "Pin the image as name:tag@sha256:<64 hex digits>.",
        ).toMatch(/@sha256:[0-9a-f]{64}$/)
      }
    })
  },
)

describe("apps/api/jaeger/compose.yaml", () => {
  const [jaeger] = services("apps/api/jaeger/compose.yaml")

  it("runs Jaeger v2 on its UI and OTLP/HTTP ports", () => {
    expect(jaeger?.image).toMatch(/^jaegertracing\/jaeger:2\.\d+\.\d+@/)
    expect(jaeger?.ports).toEqual([
      "127.0.0.1:16686:16686",
      "127.0.0.1:4318:4318",
    ])
  })

  it("keeps traces in memory, capped by a trace limit set on its command line", () => {
    expect(jaeger?.command).toEqual([
      expect.stringMatching(
        /^--set=extensions\.jaeger_storage\.backends\.some_storage\.memory\.max_traces=[1-9]\d*$/,
      ),
    ])
  })

  it("mounts no volume, and its image's /tmp is memory", () => {
    expect(jaeger?.volumes).toBeUndefined()
    expect(jaeger?.tmpfs).toEqual(["/tmp"])
  })
})
