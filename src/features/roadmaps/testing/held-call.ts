import { vi } from "vitest"

/**
 * `call`, held open (test code only): a spy that waits for `release()` before it runs
 * `call`, so a test can look at the screen while a write or a read is under way. Put
 * `held` in the repository's place of `call`. `released` settles once it is let go,
 * for a test that waits for that inside `act`.
 */
export function holdCall<Args extends unknown[], Result>(
  call: (...args: Args) => Promise<Result>,
) {
  let release: () => void = () => undefined
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  const held = vi.fn(async (...args: Args) => {
    await released
    return call(...args)
  })
  return { held, release, released }
}
