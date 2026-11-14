import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import type { Message } from '@campus/shared';
import { applyReaction, chatKeys, myReaction, nextReaction, type MessagePages } from '@/features/chat/cache';
import { Composer } from '@/features/chat/Composer';
import { MessageActionSheet } from '@/features/chat/MessageActionSheet';
import { MessageBubble } from '@/features/chat/MessageBubble';
import { useMessageActions } from '@/features/chat/useMessageActions';
import { ApiError, api } from '@/lib/api';
import { asha, dev, makeMessage, pages } from '@/testing/fixtures';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/features/auth/AuthContext', () => ({ useMe: () => ({ id: 'u-asha', name: 'Asha Rao' }) }));

const ME = asha.id;

describe('reaction helpers', () => {
  const message = makeMessage({ reactions: [{ emoji: '👍', userIds: [dev.id] }] });

  it('adds me to an existing group or starts a new one', () => {
    expect(applyReaction(message, ME, '👍').reactions).toEqual([{ emoji: '👍', userIds: [dev.id, ME] }]);
    expect(applyReaction(message, ME, '🔥').reactions).toEqual([
      { emoji: '👍', userIds: [dev.id] },
      { emoji: '🔥', userIds: [ME] },
    ]);
  });

  it('moves me when I pick another emoji and drops the group I emptied', () => {
    const mine = makeMessage({ reactions: [{ emoji: '😂', userIds: [ME] }, { emoji: '👍', userIds: [dev.id] }] });
    expect(applyReaction(mine, ME, '👍').reactions).toEqual([{ emoji: '👍', userIds: [dev.id, ME] }]);
    expect(applyReaction(mine, ME, null).reactions).toEqual([{ emoji: '👍', userIds: [dev.id] }]);
  });

  it('does not change the message it was given', () => {
    applyReaction(message, ME, '👍');
    expect(message.reactions).toEqual([{ emoji: '👍', userIds: [dev.id] }]);
  });

  it('treats a tap on my current emoji as "remove" and any other tap as "set"', () => {
    const mine = applyReaction(message, ME, '👍');
    expect(myReaction(mine, ME)).toBe('👍');
    expect(nextReaction(mine, ME, '👍')).toBeNull();
    expect(nextReaction(mine, ME, '🔥')).toBe('🔥');
    expect(nextReaction(message, ME, '👍')).toBe('👍');
  });
});

describe('MessageActionSheet', () => {
  const handlers = () => ({
    onClose: jest.fn(),
    onReply: jest.fn(),
    onReact: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(async () => true),
  });

  it('offers reply and reactions on someone else\'s message, but not edit or delete', async () => {
    const h = handlers();
    const message = makeMessage({ sender: dev });
    await render(<MessageActionSheet message={message} myId={ME} {...h} />);
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Reply' }));
    expect(h.onReply).toHaveBeenCalledWith(message);
    expect(h.onClose).toHaveBeenCalled();
  });

  it('reacts and closes, and marks the emoji I already chose', async () => {
    const h = handlers();
    const message = makeMessage({ sender: dev, reactions: [{ emoji: '❤️', userIds: [ME] }] });
    await render(<MessageActionSheet message={message} myId={ME} {...h} />);
    expect(screen.getByRole('button', { name: 'Remove ❤️ reaction' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'React with 🔥' }));
    expect(h.onReact).toHaveBeenCalledWith(message, '🔥');
    expect(h.onClose).toHaveBeenCalled();
  });

  it('asks before deleting my message and closes only after it is deleted', async () => {
    const h = handlers();
    const message = makeMessage();
    await render(<MessageActionSheet message={message} myId={ME} {...h} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(h.onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Delete this message for everyone?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete message' }));
    expect(h.onDelete).toHaveBeenCalledTimes(1);
    expect(h.onClose).toHaveBeenCalled();
  });

  it('stays open when the delete fails, and can be backed out of', async () => {
    const h = { ...handlers(), onDelete: jest.fn(async () => false) };
    await render(<MessageActionSheet message={makeMessage()} myId={ME} {...h} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete message' }));
    expect(h.onClose).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Keep message' }));
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
  });
});

describe('MessageBubble reactions', () => {
  it('lets me tap a reaction chip and tells screen readers which one is mine', async () => {
    const onReact = jest.fn();
    const message = makeMessage({ reactions: [{ emoji: '👍', userIds: [ME] }, { emoji: '🔥', userIds: [dev.id] }] });
    await render(<MessageBubble message={message} mine={false} myId={ME} onReact={onReact} />);
    expect(screen.getByRole('button', { name: '👍 1, remove your reaction' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '🔥 1, react too' }));
    expect(onReact).toHaveBeenCalledWith(message, '🔥');
  });
});

describe('Composer in reply and edit mode', () => {
  it('shows the banner and cancels it', async () => {
    const onCancel = jest.fn();
    await render(<Composer onSend={jest.fn()} banner={{ title: 'Replying to Dev Shah', text: 'Who is joining?', onCancel }} />);
    expect(screen.getByText('Replying to Dev Shah')).toBeTruthy();
    expect(screen.getByText('Who is joining?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('starts with the text being edited and keeps it when saving fails', async () => {
    const onSend = jest.fn(async () => false);
    await render(<Composer onSend={onSend} initialText="see you at 5" sendLabel="Save" />);
    await fireEvent.changeText(screen.getByLabelText('Message'), 'see you at 6');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onSend).toHaveBeenCalledWith('see you at 6');
    expect(screen.getByLabelText('Message').props.value).toBe('see you at 6');
  });

  it('clears the field once an edit is saved', async () => {
    await render(<Composer onSend={async () => true} initialText="old" sendLabel="Save" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByLabelText('Message').props.value).toBe('');
  });
});

describe('useMessageActions', () => {
  const setup = (message: Message) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    queryClient.setQueryData(chatKeys.messages('c1'), pages([message]));
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const cached = () => queryClient.getQueryData<MessagePages>(chatKeys.messages('c1'))!.pages[0]!.data[0]!;
    return { queryClient, wrapper, cached };
  };

  beforeEach(() => jest.spyOn(Alert, 'alert').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('shows my reaction at once, then stores the server\'s answer', async () => {
    const message = makeMessage({ sender: dev });
    const { wrapper, cached } = setup(message);
    const saved = { ...message, reactions: [{ emoji: '🔥', userIds: [ME, 'someone-else'] }] };
    let release: (value: Message) => void = () => undefined;
    const put = jest.spyOn(api, 'put').mockReturnValue(new Promise<Message>((resolve) => (release = resolve)) as never);
    const { result } = await renderHook(() => useMessageActions(), { wrapper });

    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = result.current.react(message, '🔥');
    });
    expect(cached().reactions).toEqual([{ emoji: '🔥', userIds: [ME] }]);
    expect(put).toHaveBeenCalledWith(`/messages/${message.id}/reaction`, { emoji: '🔥' });
    await act(async () => {
      release(saved);
      await pending;
    });
    expect(cached().reactions).toEqual(saved.reactions);
  });

  it('removes my reaction with DELETE when I tap the emoji I already chose', async () => {
    const message = makeMessage({ sender: dev, reactions: [{ emoji: '🔥', userIds: [ME] }] });
    const { wrapper, cached } = setup(message);
    const remove = jest.spyOn(api, 'remove').mockResolvedValue({ ...message, reactions: [] } as never);
    const { result } = await renderHook(() => useMessageActions(), { wrapper });
    await act(() => result.current.react(message, '🔥'));
    expect(remove).toHaveBeenCalledWith(`/messages/${message.id}/reaction`);
    expect(cached().reactions).toEqual([]);
  });

  it('undoes the reaction and says why when the server refuses', async () => {
    const message = makeMessage({ sender: dev });
    const { wrapper, cached } = setup(message);
    jest.spyOn(api, 'put').mockRejectedValue(new ApiError('message_deleted', 409, 'This message was deleted'));
    const { result } = await renderHook(() => useMessageActions(), { wrapper });
    await act(() => result.current.react(message, '🔥'));
    expect(cached().reactions).toEqual([]);
    expect(Alert.alert).toHaveBeenCalledWith('Reaction not saved', 'This message was deleted');
  });

  it('stores an edited and a deleted message, and reports a failed edit', async () => {
    const message = makeMessage();
    const { wrapper, cached } = setup(message);
    jest.spyOn(api, 'patch').mockResolvedValueOnce({ ...message, body: 'fixed', edited: true } as never);
    jest.spyOn(api, 'remove').mockResolvedValueOnce({ ...message, body: '', deleted: true } as never);
    const { result } = await renderHook(() => useMessageActions(), { wrapper });

    await act(async () => expect(await result.current.edit(message, 'fixed')).toBe(true));
    expect(cached()).toMatchObject({ body: 'fixed', edited: true });
    await act(async () => expect(await result.current.remove(message)).toBe(true));
    expect(cached().deleted).toBe(true);

    jest.spyOn(api, 'patch').mockRejectedValueOnce(new ApiError('network_error', 0, 'Cannot reach Campus. Check your connection.'));
    await act(async () => expect(await result.current.edit(message, 'again')).toBe(false));
    expect(Alert.alert).toHaveBeenCalledWith('Message not edited', 'Cannot reach Campus. Check your connection.');
  });
});
