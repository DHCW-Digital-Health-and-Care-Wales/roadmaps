import type { ReactNode } from "react"
import type { DetailLine } from "../lib/types"
import { ContentText } from "./content-text"

/** Builds nested lists from `level`, so "- " lines sit under the line above. */
export function DetailList({
  items,
  className = "",
}: {
  items: DetailLine[]
  className?: string
}) {
  const build = (start: number, level: number): [ReactNode[], number] => {
    const nodes: ReactNode[] = []
    let i = start
    let line = items[i]
    while (line && line.level >= level) {
      const index = i
      let children: ReactNode = null
      i++
      const next = items[i]
      if (next && next.level > level) {
        const [nested, after] = build(i, next.level)
        children = <ul className="mt-1 list-disc space-y-1 pl-5">{nested}</ul>
        i = after
      }
      nodes.push(
        <li key={index}>
          <ContentText value={line.text} />
          {children}
        </li>,
      )
      line = items[i]
    }
    return [nodes, i]
  }

  return (
    <ul className={`list-disc space-y-1 pl-5 text-ink-900 ${className}`}>
      {build(0, 0)[0]}
    </ul>
  )
}
