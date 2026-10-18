import { useAssistantScope } from './context';
import type { AssistantActionHandler, AssistantScreenContext } from './store';
export function AssistantScope({ context, priority = 0, stateKey = '', handle }: { context: AssistantScreenContext; priority?: number; stateKey?: string; handle?: AssistantActionHandler }) {
  useAssistantScope(context, priority, stateKey, handle); return null;
}
