import { createContext, useContext, useEffect, useId, useSyncExternalStore } from 'react';
import type { AssistantActionHandler, AssistantScreenContext } from './store';
import { AssistantStore } from './store';

export const AssistantContext = createContext<AssistantStore | null>(null);
export function useAssistantStore() { const store = useContext(AssistantContext); if (!store) throw new Error('Assistant provider missing'); return store; }
export function useAssistantSnapshot() { const store = useAssistantStore(); return useSyncExternalStore(store.subscribe, store.getSnapshot); }
export function useAssistantScope(context: AssistantScreenContext, priority: number, stateKey = '', handle?: AssistantActionHandler) {
  const store = useContext(AssistantContext), id = useId();
  useEffect(() => { store?.publish(id, { context, priority, stateKey, handle }); });
  useEffect(() => () => store?.remove(id), [store, id]);
}
