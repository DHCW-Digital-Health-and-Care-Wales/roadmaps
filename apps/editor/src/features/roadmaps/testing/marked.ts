/** What `container` marks with a `lang` of its own, as `lang: text` (test code only). */
export function marked(container: Element): string[] {
  return [...container.querySelectorAll("[lang]")].map(
    (element) =>
      `${element.getAttribute("lang") ?? ""}: ${element.textContent}`,
  )
}
