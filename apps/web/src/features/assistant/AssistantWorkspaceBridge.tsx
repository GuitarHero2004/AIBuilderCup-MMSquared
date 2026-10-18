import { useEffect } from 'react';
import { useAssistantStore } from './context';
import type { AssistantWorkspaceState, WorkspaceNavigationHandler } from './store';

/** Bind platform navigation to the same unsaved-work guards used by ordinary controls. */
export function AssistantWorkspaceBridge({ workspace, onNavigate, onStartSession }: { workspace: AssistantWorkspaceState; onNavigate: WorkspaceNavigationHandler; onStartSession: () => Promise<void> }) {
  const store = useAssistantStore();
  useEffect(() => { store.publishWorkspace(workspace, onNavigate, onStartSession); });
  return null;
}
