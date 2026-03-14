import {
  getActiveSession,
  getUserLinkedTerminal,
  getTerminalsForSession,
  getSessionSummary,
} from "./actions";
import { OpenSessionForm, ActiveSessionCard } from "./session-form";

export default async function SessionPage() {
  const activeSession = await getActiveSession();

  if (activeSession) {
    const summary = await getSessionSummary(activeSession.id);

    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
        <ActiveSessionCard session={activeSession} summary={summary} />
      </div>
    );
  }

  // Try to find user's linked terminal first, then fallback to all terminals
  const linkedTerminal = await getUserLinkedTerminal();
  const terminals = linkedTerminal ? [linkedTerminal] : await getTerminalsForSession();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
      <OpenSessionForm terminals={terminals} linkedTerminalId={linkedTerminal?.id} />
    </div>
  );
}
