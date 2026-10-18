import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ApiClient } from '../../api/client';
import { AssistantContext, useAssistantSnapshot, useAssistantStore } from './context';
import { AssistantStore } from './store';
import { AssistantDrawer } from './AssistantDrawer';
import { AgentAvatar } from './AgentAvatar';
import './assistant.css';

export function AssistantProvider({ children, api, ownerId }: { children: ReactNode; api: ApiClient; ownerId: string | null }) {
  const [store] = useState(() => new AssistantStore());
  return <AssistantContext.Provider value={store}>{children}<AssistantLauncher /><AssistantDrawer api={api} ownerId={ownerId} /></AssistantContext.Provider>;
}
export function AssistantLauncher() {
  const store = useAssistantStore(), snapshot = useAssistantSnapshot();
  return <button type="button" className="assistant-launcher" aria-haspopup="dialog" aria-expanded={snapshot.open} aria-label="Ask Luma, your GreenProcure assistant" hidden={snapshot.open} onClick={() => store.setOpen(true)}><AgentAvatar size={36} /><span>Ask Luma</span></button>;
}
