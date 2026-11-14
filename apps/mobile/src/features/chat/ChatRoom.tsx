import { useState } from 'react';
import type { Message } from '@campus/shared';
import { useMe } from '@/features/auth/AuthContext';
import { MessageList } from './ChatScreen';
import { Composer } from './Composer';
import { useSendMessage, useTypingSignal } from './hooks';
import { MessageActionSheet } from './MessageActionSheet';
import { useMessageActions } from './useMessageActions';

const QUOTE_LENGTH = 120;

/** What the composer is doing besides writing a new message. */
type Mode = { kind: 'reply' | 'edit'; message: Message } | null;

/** Messages, composer and message actions of one conversation. The screen around it adds the top bar. */
export function ChatRoom({ conversationId }: { conversationId: string }) {
  const me = useMe();
  const { send, resend } = useSendMessage(conversationId);
  const { typing, stopped } = useTypingSignal(conversationId);
  const { edit, remove, react } = useMessageActions();
  const [selected, setSelected] = useState<Message | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const editing = mode?.kind === 'edit' ? mode.message : null;

  const submit = (body: string) => {
    if (editing) {
      return edit(editing, body).then((saved) => {
        if (saved) setMode(null);
        return saved;
      });
    }
    const quoted = mode?.message;
    send({
      body,
      replyToId: quoted?.id,
      replyTo: quoted
        ? { id: quoted.id, body: quoted.body.slice(0, QUOTE_LENGTH), senderName: quoted.sender.name, deleted: false }
        : undefined,
    });
    setMode(null);
    return undefined;
  };

  const banner = mode
    ? {
        title: mode.kind === 'edit' ? 'Editing message' : `Replying to ${mode.message.sender.id === me.id ? 'yourself' : mode.message.sender.name}`,
        text: mode.message.body || mode.message.attachments[0]?.name || 'Attachment',
        onCancel: () => setMode(null),
      }
    : null;

  return (
    <>
      <MessageList conversationId={conversationId} onRetry={resend} onLongPress={setSelected} onReact={react} />
      <Composer
        // A new key remounts the composer, so it starts with the text of the message being edited.
        key={editing ? `edit:${editing.id}` : 'new'}
        onSend={submit}
        onTyping={editing ? undefined : typing}
        onStoppedTyping={editing ? undefined : stopped}
        banner={banner}
        initialText={editing?.body ?? ''}
        sendLabel={editing ? 'Save' : 'Send'}
      />
      {selected ? (
        <MessageActionSheet
          key={selected.id}
          message={selected}
          myId={me.id}
          onClose={() => setSelected(null)}
          onReply={(message) => setMode({ kind: 'reply', message })}
          onEdit={(message) => setMode({ kind: 'edit', message })}
          onReact={react}
          onDelete={remove}
        />
      ) : null}
    </>
  );
}
