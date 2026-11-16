// The review page's chrome, shared by both shapes (review-chrome.css styles it).
// A bar of links to every journey and design, one line that scrolls sideways,
// and a floating Options panel that holds the page's .controls, so a switch is
// in reach beside any design. A design is a figure[id] not inside another; its
// journey is the section[id] holding it, or the page's h1. A design's link reads
// the letter that starts its caption ("A. Outline", "B2 — …"), or its
// data-short; a journey's, its heading up to " — ".
// Under automation, or with ?capture in the URL, the bar stays at the top of
// the page and the controls stay where the page put them, so neither covers a
// design in a screenshot; ?float shows the floating chrome there too.
;(() => {
  const params = new URLSearchParams(location.search)
  const inline =
    params.has("capture") || (navigator.webdriver && !params.has("float"))
  if (inline) document.documentElement.classList.add("review-inline")

  const designs = [...document.querySelectorAll("figure[id]")].filter(
    (figure) => !figure.parentElement.closest("figure[id]"),
  )
  if (designs.length === 0) return
  const text = (element) => element?.textContent.replace(/\s+/g, " ").trim()
  const heading = document.querySelector("h1")
  if (heading && !heading.id) heading.id = "review-top"

  const groups = new Map()
  for (const figure of designs) {
    const section = figure.closest("section[id]")
    const key = section ?? heading
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(figure)
  }

  function link(href, label, className, title) {
    const a = document.createElement("a")
    a.href = href
    a.className = className
    a.textContent = label
    if (title && title !== label) a.title = title
    return a
  }

  const bar = document.createElement("nav")
  bar.className = "review-bar"
  bar.setAttribute("aria-label", "Journeys and designs")
  const designLinks = new Map()
  for (const [owner, figures] of groups) {
    const group = document.createElement("span")
    group.className = "review-group"
    if (owner) {
      const title = text(owner.querySelector("h1, h2") ?? owner)
      owner.classList.add("review-target")
      group.append(
        link(`#${owner.id}`, title.split(" — ")[0], "review-journey", title),
      )
    }
    for (const figure of figures) {
      const caption = text(figure.querySelector("figcaption, h2, h3")) ?? ""
      const short =
        figure.dataset.short ??
        caption.match(/^([A-Z][0-9]*)(?:\.|:|\s[—–-])\s/)?.[1] ??
        caption
      const a = link(`#${figure.id}`, short || figure.id, "review-design")
      a.setAttribute("aria-label", caption || figure.id)
      figure.classList.add("review-target")
      designLinks.set(figure, a)
      group.append(a)
    }
    bar.append(group)
  }
  document.body.prepend(bar)

  // A link's target lands below the bar, not under it.
  const style = document.createElement("style")
  document.head.append(style)
  const fitTargets = () => {
    style.textContent = `.review-target{scroll-margin-top:${bar.offsetHeight + 8}px}`
  }
  fitTargets()
  addEventListener("resize", fitTargets)

  // The bar marks the design in view, and scrolls itself to show its link.
  let current
  function markCurrent() {
    // A design is in view once its top passes a third of the way down.
    const line = Math.max(bar.offsetHeight + 16, innerHeight / 3)
    let inView = designs[0]
    for (const figure of designs)
      if (figure.getBoundingClientRect().top <= line) inView = figure
    if (inView === current) return
    designLinks.get(current)?.removeAttribute("aria-current")
    current = inView
    const a = designLinks.get(current)
    a.setAttribute("aria-current", "location")
    const left = a.parentElement.offsetLeft
    if (
      left < bar.scrollLeft ||
      a.offsetLeft + a.offsetWidth > bar.scrollLeft + bar.clientWidth
    )
      bar.scrollLeft = left - 12
  }
  let queued = false
  addEventListener(
    "scroll",
    () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        markCurrent()
      })
    },
    { passive: true },
  )
  markCurrent()

  const controls = document.querySelector(".controls")
  if (inline || !controls) return

  // The Options panel: a pill that names the current choices, opening the
  // page's controls above it.
  const panel = document.createElement("div")
  panel.className = "review-options"
  const body = document.createElement("div")
  body.className = "review-options-body"
  body.id = "review-options-body"
  body.hidden = true
  body.setAttribute("role", "group")
  body.setAttribute("aria-label", "Options")
  const toggle = document.createElement("button")
  toggle.type = "button"
  toggle.className = "review-options-toggle"
  toggle.setAttribute("aria-controls", body.id)
  toggle.setAttribute("aria-expanded", "false")
  controls.replaceWith(panel)
  body.append(controls)
  panel.append(body, toggle)

  function summarise() {
    const chosen = [
      ...[...controls.querySelectorAll('button[aria-pressed="true"]')].map(
        text,
      ),
      ...[...controls.querySelectorAll("select")].map((select) =>
        text(select.selectedOptions[0]),
      ),
      ...[...controls.querySelectorAll("input:checked")].map(
        (input) => text(input.labels?.[0]) ?? input.value,
      ),
    ].filter(Boolean)
    const open = !body.hidden
    toggle.textContent = `${open ? "▾" : "▴"} Options${chosen.length ? `: ${chosen.join(" · ")}` : ""}`
  }
  function setOpen(open) {
    body.hidden = !open
    toggle.setAttribute("aria-expanded", String(open))
    summarise()
  }
  toggle.addEventListener("click", () => setOpen(body.hidden))
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || body.hidden) return
    setOpen(false)
    toggle.focus()
  })
  // Bubbling here, after a switch's own handler has updated what is pressed.
  controls.addEventListener("click", summarise)
  controls.addEventListener("change", summarise)
  summarise()
})()
