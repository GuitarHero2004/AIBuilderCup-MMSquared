import type { AgentPersona } from './personas';

/** Code-native marks keep the assistant team legible at every size. */
export function AgentAvatar({ agent = 'coordinator', size = 40 }: { agent?: AgentPersona; size?: number }) {
  return <span className={'agent-avatar agent-avatar-' + agent} style={{ width: size, height: size }} aria-hidden="true">
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {agent === 'coordinator' ? <><path d="M20 9.5c1.9 5.8 4.7 8.6 10.5 10.5-5.8 1.9-8.6 4.7-10.5 10.5C18.1 24.7 15.3 21.9 9.5 20 15.3 18.1 18.1 15.3 20 9.5Z" /><path d="m29 9 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" /><path d="M11 28v4m-2-2h4" /></> : agent === 'quotation_specialist' ? <><path d="M13 8.5h11l5 5V31H11V10.5a2 2 0 0 1 2-2Z" /><path d="M24 8.5V14h5M15 18h9M15 22h9M15 26h5" /><path d="m24 27 2 2 5-6" /></> : <><path d="M10 29.5h21M13 24v-5m7 5V13m7 11v-8" /><path d="m12 13 7-5 8 3 4-4M27 7h4v4" /><circle cx="13" cy="25" r="1" fill="currentColor" stroke="none" /><circle cx="20" cy="25" r="1" fill="currentColor" stroke="none" /><circle cx="27" cy="25" r="1" fill="currentColor" stroke="none" /></>}
    </svg>
  </span>;
}
