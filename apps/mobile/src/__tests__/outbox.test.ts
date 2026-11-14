import { discard, enqueue, outboxStore, retry } from '@/features/chat/outbox';
import { api } from '@/lib/api';
import { asha, makeMessage } from '@/testing/fixtures';

jest.mock('@/lib/socket', () => ({ getSocket: () => null }));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const queue = () => outboxStore.get().c1 ?? [];

beforeEach(() => outboxStore.set({}));
afterEach(() => jest.restoreAllMocks());

describe('outbox', () => {
  it('shows the message as sending at once and removes it when the server confirms', async () => {
    const saved = makeMessage({ body: 'hello' });
    const post = jest.spyOn(api, 'post').mockResolvedValue(saved);
    const onSaved = jest.fn();

    enqueue({ conversationId: 'c1', body: 'hello' }, asha, onSaved);
    expect(queue()).toHaveLength(1);
    expect(queue()[0]).toMatchObject({ body: 'hello', status: 'sending', sender: asha });

    await flush();
    expect(post).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith(saved);
    expect(queue()).toHaveLength(0);
  });

  it('keeps a failed message, and a retry reuses the same clientMessageId', async () => {
    const post = jest.spyOn(api, 'post').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(makeMessage());
    const onSaved = jest.fn();

    enqueue({ conversationId: 'c1', body: 'will fail' }, asha, onSaved);
    await flush();
    expect(queue()[0]!.status).toBe('failed');
    const firstId = (post.mock.calls[0]![1] as { clientMessageId: string }).clientMessageId;

    retry(queue()[0]!, onSaved);
    expect(queue()[0]!.status).toBe('sending');
    await flush();
    expect((post.mock.calls[1]![1] as { clientMessageId: string }).clientMessageId).toBe(firstId);
    expect(queue()).toHaveLength(0);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('gives every message its own clientMessageId and can discard one', async () => {
    jest.spyOn(api, 'post').mockRejectedValue(new Error('offline'));
    enqueue({ conversationId: 'c1', body: 'one' }, asha, jest.fn());
    enqueue({ conversationId: 'c1', body: 'two' }, asha, jest.fn());
    await flush();
    const [newest, oldest] = queue();
    expect(newest!.body).toBe('two');
    expect(newest!.clientMessageId).not.toBe(oldest!.clientMessageId);
    discard(newest!);
    expect(queue().map((m) => m.body)).toEqual(['one']);
  });
});
