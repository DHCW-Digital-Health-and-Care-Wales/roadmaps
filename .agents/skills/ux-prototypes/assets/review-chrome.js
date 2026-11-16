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
    a.title = title ?? label
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
      const a = link(
        `#${figure.id}`,
        short || figure.id,
        "review-design",
        caption || figure.id,
      )
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
  // A design whose link was followed stays marked, even where the page cannot
  // scroll it to the top, until the reader scrolls on their own.
  let pinned
  /** The design whose top has passed a third of the way down, or the last at the page's foot. */
  function designInView() {
    if (pinned) return pinned
    const root = document.documentElement
    if (root.scrollTop > 0 && scrollY + innerHeight >= root.scrollHeight - 2)
      return designs.at(-1)
    const line = Math.max(bar.offsetHeight + 16, innerHeight / 3)
    let inView = designs[0]
    for (const figure of designs)
      if (figure.getBoundingClientRect().top <= line) inView = figure
    return inView
  }
  function markCurrent(inView = designInView()) {
    if (inView === current) return
    designLinks.get(current)?.removeAttribute("aria-current")
    current = inView
    const a = designLinks.get(current)
    a.setAttribute("aria-current", "location")
    // Show the link's group from its start, or as much of it as keeps the
    // link itself in view.
    const right = a.offsetLeft + a.offsetWidth
    if (
      a.offsetLeft < bar.scrollLeft ||
      right > bar.scrollLeft + bar.clientWidth
    )
      bar.scrollLeft = Math.max(
        a.parentElement.offsetLeft - 4,
        right - bar.clientWidth + 8,
      )
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
  addEventListener("resize", () => markCurrent())
  bar.addEventListener("click", (event) => {
    const a = event.target.closest("a")
    pinned = designs.find((f) => designLinks.get(f) === a)
    markCurrent()
  })
  for (const type of ["wheel", "touchstart", "keydown"])
    addEventListener(type, () => (pinned = undefined), { passive: true })
  markCurrent()

  const controls = document.querySelector(".controls")
  if (inline || !controls) return

  // The Options panel: a pill that names the current choices, opening the
  // page's controls above it. The pill comes first, so Tab moves from it into
  // the controls; the panel's column runs in reverse to draw them above.
  document.documentElement.classList.add("review-floating")
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
  panel.append(toggle, body)

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
    const arrow = document.createElement("span")
    arrow.setAttribute("aria-hidden", "true")
    arrow.textContent = body.hidden ? "▴ " : "▾ "
    toggle.replaceChildren(
      arrow,
      `Options${chosen.length ? `: ${chosen.join(" · ")}` : ""}`,
    )
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
  addEventListener("pointerdown", (event) => {
    if (!body.hidden && !panel.contains(event.target)) setOpen(false)
  })

  // A switch that changes the page's height, such as Zoom or Screen, keeps the
  // design in view where it was: its top is noted before the switch's own
  // handler runs (capturing), and restored after it (bubbling).
  let anchor
  const noteAnchor = () => {
    const figure = designInView()
    anchor = { figure, top: figure.getBoundingClientRect().top }
  }
  const afterSwitch = () => {
    summarise()
    if (anchor)
      scrollBy(0, anchor.figure.getBoundingClientRect().top - anchor.top)
    anchor = undefined
    markCurrent()
  }
  for (const type of ["click", "change"]) {
    controls.addEventListener(type, noteAnchor, true)
    controls.addEventListener(type, afterSwitch)
  }
  summarise()
})()
