import { addMessage, applyRead, isReadByAll, mergeOutbox, replaceMessage } from '@/features/chat/cache';
import type { ChatMessage } from '@/features/chat/types';
import { typingLabel } from '@/features/realtime/liveState';
import { formatListTime } from '@/lib/time';
import { dev, makeDetail, makeMessage, pages } from '@/testing/fixtures';

describe('message cache', () => {
  it('puts a new message at the front of the newest page without changing the old object', () => {
    const old = makeMessage();
    const data = pages([old]);
    const fresh = makeMessage();
    const next = addMessage(data, fresh)!;
    expect(next.pages[0]!.data.map((m) => m.id)).toEqual([fresh.id, old.id]);
    expect(data.pages[0]!.data).toHaveLength(1);
  });

  it('does not add the same message twice (socket echo after the acknowledgement)', () => {
    const message = makeMessage();
    const once = addMessage(pages([]), message)!;
    const twice = addMessage(once, { ...message, body: 'edited copy' })!;
    expect(twice.pages[0]!.data).toHaveLength(1);
    expect(twice.pages[0]!.data[0]!.body).toBe('edited copy');
  });

  it('replaces a message wherever it sits in the pages', () => {
    const older = makeMessage();
    const data = pages([makeMessage()], [older]);
    const next = replaceMessage(data, { ...older, body: 'changed', edited: true })!;
    expect(next.pages[1]!.data[0]).toMatchObject({ body: 'changed', edited: true });
  });

  it('leaves an unloaded conversation untouched', () => {
    expect(addMessage(undefined, makeMessage())).toBeUndefined();
  });

  it('shows outgoing messages first and drops them once the server copy exists', () => {
    const confirmed = makeMessage({ clientMessageId: 'same' });
    const sending: ChatMessage = { ...makeMessage({ id: 'pending:same', clientMessageId: 'same' }), status: 'sending' };
    const failed: ChatMessage = { ...makeMessage({ id: 'pending:other', clientMessageId: 'other' }), status: 'failed' };
    const rows = mergeOutbox(pages([confirmed]), [failed, sending]);
    expect(rows.map((m) => m.id)).toEqual(['pending:other', confirmed.id]);
  });
});

describe('read receipts', () => {
  it('is read only when every other member has reached the message', () => {
    const detail = makeDetail();
    expect(isReadByAll(detail, '600000000000000000000005')).toBe(false);
    const read = applyRead(detail, { userId: dev.id, messageId: '600000000000000000000007' });
    expect(isReadByAll(read, '600000000000000000000005')).toBe(true);
    expect(isReadByAll(read, '600000000000000000000009')).toBe(false);
  });
});

describe('labels', () => {
  it('describes who is typing', () => {
    expect(typingLabel([])).toBeNull();
    expect(typingLabel(['Asha Rao'])).toBe('Asha is typing');
    expect(typingLabel(['Asha Rao', 'Dev Shah'])).toBe('Asha and Dev are typing');
    expect(typingLabel(['A', 'B', 'C'])).toBe('3 people are typing');
  });

  it('shows the time for today, Yesterday, then the date', () => {
    const now = new Date(2026, 10, 15, 18, 0);
    expect(formatListTime(new Date(2026, 10, 15, 9, 5).toISOString(), now)).toBe('09:05');
    expect(formatListTime(new Date(2026, 10, 14, 23, 59).toISOString(), now)).toBe('Yesterday');
    expect(formatListTime(new Date(2026, 10, 2, 12, 0).toISOString(), now)).toBe('2 Nov');
  });
});
