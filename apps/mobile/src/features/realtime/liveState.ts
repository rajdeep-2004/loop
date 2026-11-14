import { createStore, useStore } from '@/lib/store';

const TYPING_TTL_MS = 5000;

type Typing = Record<string, Record<string, string>>; // conversationId -> userId -> name
export const typingStore = createStore<Typing>({});
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Records that someone started or stopped typing. A "started" expires by itself if no "stopped" arrives. */
export function setTyping(event: { conversationId: string; userId: string; name: string; typing: boolean }): void {
  const timerKey = `${event.conversationId}:${event.userId}`;
  clearTimeout(timers.get(timerKey));
  typingStore.set((state) => {
    const current = { ...(state[event.conversationId] ?? {}) };
    if (event.typing) current[event.userId] = event.name;
    else delete current[event.userId];
    return { ...state, [event.conversationId]: current };
  });
  if (event.typing) {
    timers.set(timerKey, setTimeout(() => setTyping({ ...event, typing: false }), TYPING_TTL_MS));
  }
}

const NOBODY: string[] = [];
export function useTypingNames(conversationId: string): string[] {
  const names = useStore(typingStore, (state) => state[conversationId]);
  return names ? Object.values(names) : NOBODY;
}

/** "Asha is typing", "Asha and Dev are typing", "3 people are typing". */
export function typingLabel(names: string[]): string | null {
  const first = names.map((name) => name.split(' ')[0]);
  if (first.length === 0) return null;
  if (first.length === 1) return `${first[0]} is typing`;
  if (first.length === 2) return `${first[0]} and ${first[1]} are typing`;
  return `${first.length} people are typing`;
}

export const presenceStore = createStore<Record<string, boolean>>({});
export const setPresence = (userId: string, online: boolean) =>
  presenceStore.set((state) => ({ ...state, [userId]: online }));

/** Live presence if an update has arrived, otherwise the value that came with the API response. */
export const useOnline = (userId: string | undefined, fallback = false) =>
  useStore(presenceStore, (state) => (userId ? (state[userId] ?? fallback) : false));
