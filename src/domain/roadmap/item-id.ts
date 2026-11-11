/** Consonants only, so an ID never spells a word, a month or `TRUE`/`FALSE`. */
const LETTERS = "bcdfghjkmnpqrstvwxz"
/** No `0`/`1`, which read like `o`/`l`. */
const CHARACTERS = `${LETTERS}23456789`
const LENGTH = 8

/** Fills a byte array with random values, as `crypto.getRandomValues` does. */
export type RandomBytes = (
  bytes: Uint8Array<ArrayBuffer>,
) => Uint8Array<ArrayBuffer>

const cryptoRandomBytes: RandomBytes = (bytes) => crypto.getRandomValues(bytes)

/**
 * A new roadmap item ID (ADR-012 Option 6): eight random lower-case characters starting
 * with a consonant, such as `k7q2xwbn`. A spreadsheet can't read it as a number, date,
 * boolean or formula, and it holds no word.
 */
export function createItemId(randomBytes: RandomBytes = cryptoRandomBytes) {
  let id = ""
  while (id.length < LENGTH) {
    const alphabet = id === "" ? LETTERS : CHARACTERS
    const [byte = 0] = randomBytes(new Uint8Array(1))
    // Rejection sampling keeps every character equally likely.
    const limit = 256 - (256 % alphabet.length)
    if (byte < limit) id += alphabet.charAt(byte % alphabet.length)
  }
  return id
}
