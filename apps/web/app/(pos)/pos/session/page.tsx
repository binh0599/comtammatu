import {
  getActiveSession,
  getTerminalsForSession,
  getSessionSummary,
} from "./actions";
import { OpenSessionForm, ActiveSessionCard } from "./session-form";

export default async function SessionPage() {
  const activeSession = await getActiveSession();

  if (activeSession) {
    const summary = await getSessionSummary(activeSession.id);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <ActiveSessionCard session={activeSession} summary={summary} />
      </div>
    );
  }

  const terminals = await getTerminalsForSession();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <OpenSessionForm terminals={terminals} />
    </div>
  );
}
