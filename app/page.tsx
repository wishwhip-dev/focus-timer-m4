import { DataPanel } from "@/components/data-panel";
import { FocusTimer } from "@/components/focus-timer";
import { SessionHistory } from "@/components/session-history";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center gap-8 px-4 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Focus timer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          25 minutes of focus, a 5-minute break, and a count of what you finished.
        </p>
      </header>
      <FocusTimer />
      <SessionHistory />
      <DataPanel />
      <p className="text-xs text-muted-foreground">
        Shortcuts: Space starts or pauses, R resets.
      </p>
    </main>
  );
}