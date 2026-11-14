import { fireEvent, render, screen } from '@testing-library/react-native';
import { Composer } from '@/features/chat/Composer';
import { ConversationRow } from '@/features/chat/ConversationRow';
import { MessageBubble, footerText } from '@/features/chat/MessageBubble';
import type { ChatMessage } from '@/features/chat/types';
import { makeConversation, makeMessage } from '@/testing/fixtures';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

describe('MessageBubble', () => {
  it('shows the text and a quoted reply', async () => {
    const message = makeMessage({ body: 'Me!', replyTo: { id: 'x', body: 'Who is joining?', senderName: 'Dev Shah', deleted: false } });
    await render(<MessageBubble message={message} mine={false} showSender />);
    expect(screen.getByText('Me!')).toBeTruthy();
    expect(screen.getByText('Who is joining?')).toBeTruthy();
    expect(screen.getByText('Asha Rao')).toBeTruthy();
  });

  it('shows a placeholder for a deleted message and hides its text', async () => {
    await render(<MessageBubble message={makeMessage({ deleted: true, body: '' })} mine />);
    expect(screen.getByText('Message deleted')).toBeTruthy();
  });

  it('offers a retry on a failed message', async () => {
    const failed: ChatMessage = { ...makeMessage(), status: 'failed' };
    const onRetry = jest.fn();
    await render(<MessageBubble message={failed} mine onRetry={onRetry} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Message not sent. Tap to retry' }));
    expect(onRetry).toHaveBeenCalledWith(failed);
  });

  it('shows reactions with counts and the thread reply count', async () => {
    const message = makeMessage({ reactions: [{ emoji: '🔥', userIds: ['a', 'b'] }], threadReplyCount: 12 });
    await render(<MessageBubble message={message} mine={false} onOpenThread={jest.fn()} />);
    expect(screen.getByText('🔥 2')).toBeTruthy();
    expect(screen.getByText('12 replies →')).toBeTruthy();
  });

  it('builds the footer from status, edit flag and receipt', () => {
    expect(footerText({ ...makeMessage(), status: 'sending' })).toBe('Sending');
    expect(footerText(makeMessage({ edited: true }), 'Read')).toMatch(/^\d\d:\d\d · Edited · Read$/);
  });
});

describe('Composer', () => {
  it('sends trimmed text once and clears the field', async () => {
    const onSend = jest.fn();
    await render(<Composer onSend={onSend} />);
    const input = screen.getByLabelText('Message');
    await fireEvent.changeText(input, '  hello  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).toHaveBeenCalledWith('hello');
    expect(screen.getByLabelText('Message').props.value).toBe('');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('does not send whitespace', async () => {
    const onSend = jest.fn();
    await render(<Composer onSend={onSend} />);
    await fireEvent.changeText(screen.getByLabelText('Message'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).not.toHaveBeenCalled();
  });
});

describe('ConversationRow', () => {
  it('announces unread messages and shows the preview', async () => {
    await render(<ConversationRow conversation={makeConversation({ unreadCount: 3 })} onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Dev Shah, 3 unread' })).toBeTruthy();
    expect(screen.getByText('see you there')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('prefixes the sender in group chats', async () => {
    await render(<ConversationRow conversation={makeConversation({ type: 'group', title: 'Hackathon', peer: null, lastMessage: { body: 'on it', senderName: 'Asha Rao', createdAt: '2026-11-15T09:05:00.000Z' } })} onPress={jest.fn()} />);
    expect(screen.getByText('Asha: on it')).toBeTruthy();
    expect(screen.getByText('Group')).toBeTruthy();
  });
});
