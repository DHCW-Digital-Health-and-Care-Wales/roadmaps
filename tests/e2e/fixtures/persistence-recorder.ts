import type { Page } from "@playwright/test"

const BINDING = "__e2eRecordPersisted"

/**
 * Records, for the whole test, every text the page keeps outside memory or shows to
 * other parties: storage writes, cookies, URL changes and console output. Returns the
 * live list. A value written and removed again before the test ends is still caught.
 */
export async function recordPersistence(page: Page): Promise<string[]> {
  const records: string[] = []
  await page.exposeFunction(BINDING, (text: string) => {
    records.push(text)
  })
  page.on("console", (message) => records.push(message.text()))
  page.on("framenavigated", (frame) => records.push(frame.url()))
  await page.addInitScript(patchPersistence, BINDING)
  return records
}

/** The current URL, cookies and storage contents, in case anything bypassed the hooks. */
export function snapshotPersistence(page: Page): Promise<string[]> {
  return page.evaluate(() => [
    location.href,
    document.cookie,
    JSON.stringify(Object.entries(localStorage)),
    JSON.stringify(Object.entries(sessionStorage)),
  ])
}

/** Runs in the page before its scripts: reports each value as it is persisted. */
function patchPersistence(binding: string) {
  const report = (text: string) => {
    const record = Reflect.get(window, binding) as
      ((text: string) => Promise<void>) | undefined
    void record?.(text)
  }

  // `Reflect` keeps the originals' types without detaching methods from their objects.
  const setItem = Reflect.get(Storage.prototype, "setItem")
  Storage.prototype.setItem = function (this: Storage, key, value) {
    report(`${key}=${value}`)
    Reflect.apply(setItem, this, [key, value])
  }

  for (const method of ["pushState", "replaceState"] as const) {
    const original = Reflect.get(History.prototype, method)
    History.prototype[method] = function (this: History, data, unused, url) {
      if (url != null) report(String(url))
      Reflect.apply(original, this, [data, unused, url])
    }
  }

  const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")
  const setCookie = cookie && Reflect.get(cookie, "set")
  if (cookie && setCookie) {
    Object.defineProperty(Document.prototype, "cookie", {
      ...cookie,
      set(this: Document, value: string) {
        report(value)
        Reflect.apply(setCookie, this, [value])
      },
    })
  }
}
