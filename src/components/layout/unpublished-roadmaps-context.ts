import { createContext } from "react"

/**
 * How many roadmaps have unpublished changes, for the shell's menu buttons, which carry
 * a dot and say so while it is above 0 (STY-055 D4). Provided by `AppShell`, from the
 * roadmaps feature through the root route.
 */
export const UnpublishedRoadmapsContext = createContext(0)
