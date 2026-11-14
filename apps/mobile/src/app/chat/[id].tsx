import { router, useLocalSearchParams } from 'expo-router';
import { Pressable } from 'react-native';
import { MessageList } from '@/features/chat/ChatScreen';
import { Composer } from '@/features/chat/Composer';
import { useConversation, useSendMessage, useTypingSignal } from '@/features/chat/hooks';
import { useOnline } from '@/features/realtime/liveState';
import { errorMessage } from '@/lib/api';
import { ErrorState, Screen, Tag, TopBar, colors } from '@/ui';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversation = useConversation(id);
  const { send, resend } = useSendMessage(id);
  const { typing, stopped } = useTypingSignal(id);
  const peer = conversation.data?.peer;
  const online = useOnline(peer?.id, peer?.online);

  if (conversation.isError) {
    return (
      <Screen padded={false}>
        <TopBar title="Chat" back />
        <ErrorState message={errorMessage(conversation.error)} onRetry={() => conversation.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      <Pressable onPress={() => peer && router.push(`/user/${peer.id}`)} disabled={!peer} accessibilityRole={peer ? 'button' : undefined} accessibilityLabel={peer ? `Open ${peer.name}'s profile` : undefined}>
        <TopBar
          title={conversation.data?.title ?? 'Chat'}
          back
          color={conversation.data?.color ?? colors.paper}
          right={online ? <Tag label="Online" color={colors.mint} /> : null}
        />
      </Pressable>
      <MessageList conversationId={id} onRetry={resend} />
      <Composer onSend={(body) => send({ body })} onTyping={typing} onStoppedTyping={stopped} />
    </Screen>
  );
}
