import type { AssistantAction } from '../../api/types';

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
interface Scope { priority: number; context: AssistantScreenContext; stateKey: string; handle?: AssistantActionHandler }
export interface AssistantSnapshot { context: AssistantScreenContext; generation: number; open: boolean }
const empty: AssistantScreenContext = { screen: 'workspace', label: 'Sourcing workspace', caseId: null, caseRevision: null, dirty: false, busy: false };

/** A screen publishes structured references, never DOM text or unsaved field values. */
export class AssistantStore {
  private scopes = new Map<string, Scope>();
  private listeners = new Set<() => void>();
  private signature = '';
  private snapshot: AssistantSnapshot = { context: empty, generation: 0, open: false };
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
  dispatch(action: AssistantAction, generation: number): boolean {
    if (generation !== this.snapshot.generation || this.snapshot.context.busy || action.case_id !== this.snapshot.context.caseId || action.expected_case_revision !== this.snapshot.context.caseRevision) return false;
    for (const scope of [...this.scopes.values()].sort((a, b) => b.priority - a.priority)) if (scope.handle?.(action)) return true;
    return false;
  }
}
