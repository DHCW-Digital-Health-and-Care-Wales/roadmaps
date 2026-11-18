/**
 * Everything the page's live regions say from now on, in order: the search's and the
 * shell's, which are always in the page.
 */
export function recordSayings(): string[] {
  const said: string[] = []
  const observer = new MutationObserver(() => {
    for (const region of document.querySelectorAll("[aria-live=polite]")) {
      const text = region.textContent
      if (text && said.at(-1) !== text) said.push(text)
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })
  return said
}
