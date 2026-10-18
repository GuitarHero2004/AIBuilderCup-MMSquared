import type { AssistantAction, WorkspaceAssistantAction } from '../../api/types';

export interface AssistantScreenContext {
  screen: 'workspace' | 'case' | 'intake' | 'review' | 'comparison' | 'selection';
  label: string;
  caseId: string | null;
  caseRevision: number | null;
  quoteId?: string | null;
  draftRevision?: number | null;
  selectionId?: string | null;
  inputFingerprint?: string | null;
  dirty: boolean;
  busy: boolean;
  unavailable?: string;
}
export type AssistantActionHandler = (action: AssistantAction) => boolean;
export interface AssistantWorkspaceState {
  authenticated: boolean;
  loading: boolean;
  busy: boolean;
  canCreate: boolean;
  error: string | null;
  screen: 'workspace' | 'help' | 'create' | 'case' | 'intake' | 'review' | 'comparison' | 'selection';
}
export type WorkspaceNavigationHandler = (action: WorkspaceAssistantAction, stillCurrent: () => boolean) => Promise<boolean>;
interface Scope { priority: number; context: AssistantScreenContext; stateKey: string; handle?: AssistantActionHandler }
export interface AssistantSnapshot { context: AssistantScreenContext; generation: number; open: boolean; workspace: AssistantWorkspaceState }
const empty: AssistantScreenContext = { screen: 'workspace', label: 'Sourcing workspace', caseId: null, caseRevision: null, dirty: false, busy: false };

/** A screen publishes structured references, never DOM text or unsaved field values. */
export class AssistantStore {
  private scopes = new Map<string, Scope>();
  private listeners = new Set<() => void>();
  private signature = '';
  private snapshot: AssistantSnapshot = { context: empty, generation: 0, open: false, workspace: { authenticated: false, loading: false, busy: false, canCreate: false, error: null, screen: 'workspace' } };
  private workspaceSignature = '';
  private workspaceHandler?: WorkspaceNavigationHandler;
  private sessionHandler?: () => Promise<void>;
  private navigating = false;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  private emit() { for (const listener of this.listeners) listener(); }
  private update() {
    const selected = [...this.scopes.values()].sort((a, b) => b.priority - a.priority)[0];
    const context = selected?.context ?? empty;
    const signature = JSON.stringify([context, selected?.stateKey ?? '']);
    if (signature === this.signature) return;
    this.signature = signature;
    this.snapshot = { ...this.snapshot, context, generation: this.snapshot.generation + 1 }; this.emit();
  }
  publish(id: string, scope: Scope) { this.scopes.set(id, scope); this.update(); }
  remove(id: string) { this.scopes.delete(id); this.update(); }
  setOpen(open: boolean) { if (this.snapshot.open !== open) { this.snapshot = { ...this.snapshot, open }; this.emit(); } }
  publishWorkspace(workspace: AssistantWorkspaceState, navigate: WorkspaceNavigationHandler, startSession: () => Promise<void>) {
    this.workspaceHandler = navigate; this.sessionHandler = startSession;
    const signature = JSON.stringify(workspace);
    if (signature !== this.workspaceSignature) {
      this.workspaceSignature = signature;
      this.snapshot = { ...this.snapshot, workspace }; this.emit();
    }
  }
  async startSession() { await this.sessionHandler?.(); }
  async navigateWorkspace(action: WorkspaceAssistantAction): Promise<boolean> {
    if (!this.workspaceHandler || this.navigating || this.snapshot.context.busy || this.snapshot.workspace.busy) return false;
    if (action.kind === 'create_case' && !this.snapshot.workspace.canCreate) return false;
    if (action.case_id && !this.snapshot.workspace.authenticated) return false;
    const generation = this.snapshot.generation, signature = this.workspaceSignature;
    this.navigating = true;
    try { return await this.workspaceHandler(action, () => this.snapshot.generation === generation && this.workspaceSignature === signature); }
    finally { this.navigating = false; }
  }
  dispatch(action: AssistantAction, generation: number): boolean {
    if (generation !== this.snapshot.generation || this.snapshot.context.busy || action.case_id !== this.snapshot.context.caseId || action.expected_case_revision !== this.snapshot.context.caseRevision) return false;
    for (const scope of [...this.scopes.values()].sort((a, b) => b.priority - a.priority)) if (scope.handle?.(action)) return true;
    return false;
  }
}
