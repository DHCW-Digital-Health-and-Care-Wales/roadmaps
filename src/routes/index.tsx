import { createFileRoute } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/")({
  component: HomePage,
})

// Placeholder until the app shell and roadmaps feature land.
function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Product Roadmaps
      </h1>
      <p className="text-muted-foreground">Your roadmaps will appear here.</p>
      <Button disabled>Connect Google account</Button>
    </main>
  )
}
