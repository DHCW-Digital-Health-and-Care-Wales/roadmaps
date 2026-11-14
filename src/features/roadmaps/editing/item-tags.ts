/**
 * The rules of editing an item's tags (STY-037): what adding and renaming keep, and
 * which of the roadmap's other tags are offered. Tags are free text in English; pure
 * functions over their names, which the form's Tags field applies.
 */

import { TAG_SEPARATOR } from "@/domain/roadmap/roadmap-changes"

/** A tag the roadmap's other items carry, and how many of them carry it. */
export interface TagInUse {
  /** In the spelling most of them use. */
  readonly tag: string
  readonly count: number
}

/** What the field says after a change that did not go as typed. */
export interface TagNote {
  /**
   * `repeat`: `typed` was not added, as the item has `tag` (S4). `respelt` and
   * `respeltRename`: `typed` was added, or a tag renamed to it, as `tag`, the roadmap's
   * spelling (S21). `merged`: the tag `typed` was renamed to `tag`, which the item has,
   * so it went (S6).
   */
  readonly kind: "repeat" | "respelt" | "respeltRename" | "merged"
  readonly typed: string
  readonly tag: string
}

/** What a Tags field holds that is not yet a tag: confirming or shutting it keeps both. */
export interface TagsDraft {
  /** Text typed in "Add a tag" but not yet added (S8). */
  readonly adding: string
  /** The tag whose name is being changed, with the name as typed so far (S15). */
  readonly renaming: { readonly index: number; readonly name: string } | null
}

export const NO_DRAFT: TagsDraft = { adding: "", renaming: null }

/** Tags that differ only in capitals are one tag (D6, D15). */
const keyOf = (tag: string) => tag.toLocaleLowerCase("en-GB")

/** A tag as kept: trimmed at its ends, each run of white space one space. */
const clean = (text: string) => text.replace(/\s+/g, " ").trim()

/** Whether `text` holds more than the one tag being typed: a comma or a line break (S7). */
export function endsATag(text: string): boolean {
  return TAG_SEPARATOR.test(text)
}

const byName = (a: string, b: string) =>
  a.localeCompare(b, "en", { sensitivity: "base" })

/**
 * The tags carried by items whose tags are `itemTags`, in the roadmap's order: most
 * used first, then alphabetical (D8). Spellings that differ only in capitals are one
 * tag, in the most used spelling, the first met when two are used as often (S21); an
 * item counts once for a tag, however often it repeats it.
 */
export function tagsInUse(
  itemTags: readonly (readonly string[])[],
): TagInUse[] {
  const uses = new Map<
    string,
    { count: number; spellings: Map<string, number> }
  >()
  for (const tags of itemTags) {
    const counted = new Set<string>()
    for (const tag of tags) {
      const key = keyOf(tag)
      if (counted.has(key)) continue
      counted.add(key)
      const use = uses.get(key) ?? {
        count: 0,
        spellings: new Map<string, number>(),
      }
      use.count += 1
      use.spellings.set(tag, (use.spellings.get(tag) ?? 0) + 1)
      uses.set(key, use)
    }
  }
  return [...uses.values()]
    .map(({ count, spellings }) => ({ tag: mostUsed(spellings), count }))
    .sort((a, b) => b.count - a.count || byName(a.tag, b.tag))
}

/** The spelling used most often, the first met among those used as often. */
function mostUsed(spellings: ReadonlyMap<string, number>): string {
  let best = ""
  let most = 0
  for (const [spelling, count] of spellings) {
    if (count > most) {
      best = spelling
      most = count
    }
  }
  return best
}

/**
 * Those of `inUse` an item with `tags` lacks whose name holds `query`, whatever the
 * capitals of either, in `inUse`'s order (S3, S18).
 */
export function offeredTags(
  inUse: readonly TagInUse[],
  tags: readonly string[],
  query: string,
): TagInUse[] {
  const has = new Set(tags.map(keyOf))
  const wanted = keyOf(clean(query))
  return inUse.filter(
    ({ tag }) => !has.has(keyOf(tag)) && keyOf(tag).includes(wanted),
  )
}

/** `typed` in the spelling `inUse` has for it (S21), or as it is. */
function spelt(typed: string, inUse: readonly TagInUse[]): string {
  return inUse.find(({ tag }) => keyOf(tag) === keyOf(typed))?.tag ?? typed
}

/**
 * `tags` with each tag of `text` added at the end: a comma or a line break ends a tag
 * (S7), a tag the item has, whatever its capitals, is not added again (S4), and a typed
 * tag takes the spelling `inUse` has for it (S21).
 */
export function addTags(
  tags: readonly string[],
  text: string,
  inUse: readonly TagInUse[],
): { tags: string[]; added: string[]; notes: TagNote[] } {
  const next = [...tags]
  const added: string[] = []
  const notes: TagNote[] = []
  for (const typed of text.split(TAG_SEPARATOR).map(clean)) {
    if (typed === "") continue
    const tag = spelt(typed, inUse)
    const existing = next.find((other) => keyOf(other) === keyOf(tag))
    if (existing !== undefined) {
      notes.push({ kind: "repeat", typed, tag: existing })
      continue
    }
    next.push(tag)
    added.push(tag)
    if (tag !== typed) notes.push({ kind: "respelt", typed, tag })
  }
  return { tags: next, added, notes }
}

/**
 * `tags` with the one at `index` renamed to `text` in its place (S6): a comma or a line
 * break in it reads as a space, and a blank or unchanged name keeps the old one. A name the item
 * has, whatever its capitals, drops the renamed tag, leaving that one once; any other
 * takes the spelling `inUse` has for it (S21).
 */
export function renameTag(
  tags: readonly string[],
  index: number,
  text: string,
  inUse: readonly TagInUse[],
): { tags: readonly string[]; notes: TagNote[] } {
  const old = tags[index]
  const typed = clean(text.split(TAG_SEPARATOR).join(" "))
  // A name left as it was read keeps its white space too.
  if (old === undefined || typed === "" || text.trim() === old) {
    return { tags, notes: [] }
  }
  const tag = spelt(typed, inUse)
  if (tag === old) return { tags, notes: [] }
  const existing = tags.find(
    (other, at) => at !== index && keyOf(other) === keyOf(tag),
  )
  if (existing !== undefined) {
    return {
      tags: tags.filter((_, at) => at !== index),
      notes: [{ kind: "merged", typed: old, tag: existing }],
    }
  }
  return {
    tags: tags.map((other, at) => (at === index ? tag : other)),
    notes: tag === typed ? [] : [{ kind: "respeltRename", typed, tag }],
  }
}

/**
 * `tags` with what `draft` holds kept, as confirming the form or shutting the field
 * does: the name still being changed (S15), then the text typed but not yet added (S8).
 */
export function settleTags(
  tags: readonly string[],
  { adding, renaming }: TagsDraft,
  inUse: readonly TagInUse[],
): readonly string[] {
  const renamed = renaming
    ? renameTag(tags, renaming.index, renaming.name, inUse).tags
    : tags
  return clean(adding) === "" ? renamed : addTags(renamed, adding, inUse).tags
}
