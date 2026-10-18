import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ApiClient } from '../../api/client';
import { Icon } from '../../components/Icon';
import { AssistantContext, useAssistantSnapshot, useAssistantStore } from './context';
import { AssistantStore } from './store';
import { AssistantDrawer } from './AssistantDrawer';
import './assistant.css';

export function AssistantProvider({ children, api, ownerId }: { children: ReactNode; api: ApiClient; ownerId: string | null }) {
  const [store] = useState(() => new AssistantStore());
  return <AssistantContext.Provider value={store}>{children}<AssistantDrawer api={api} ownerId={ownerId} /></AssistantContext.Provider>;
}
export function AssistantLauncher() {
  const store = useAssistantStore(), snapshot = useAssistantSnapshot();
  return <button type="button" className="button button-secondary assistant-launcher" aria-haspopup="dialog" aria-expanded={snapshot.open} onClick={() => store.setOpen(true)}><Icon name="chat" size={18} />Ask GreenProcure</button>;
}
