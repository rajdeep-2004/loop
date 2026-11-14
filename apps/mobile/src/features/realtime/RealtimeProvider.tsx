import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import type { ConversationDetail } from '@campus/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { addMessage, applyRead, chatKeys, storeMessageUpdate, type MessagePages } from '@/features/chat/cache';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { setPresence, setTyping } from './liveState';

/**
 * Keeps one socket open while signed in and folds every server event into the
 * React Query cache, so screens update without knowing a socket exists.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status !== 'signedIn') return;
    const socket = connectSocket();
    let connectedBefore = false;

    const refreshLists = () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      void queryClient.invalidateQueries({ queryKey: chatKeys.unreadTotal });
    };

    socket.on('connect', () => {
      // After a reconnect, anything may have been missed: reload what is on screen.
      if (connectedBefore) void queryClient.invalidateQueries();
      connectedBefore = true;
    });
    socket.on('message:new', (message) => {
      const key = message.threadRootId
        ? chatKeys.thread(message.conversationId, message.threadRootId)
        : chatKeys.messages(message.conversationId);
      queryClient.setQueryData<MessagePages>(key, (data) => addMessage(data, message));
      if (!message.threadRootId) refreshLists();
    });
    socket.on('message:updated', (message) => storeMessageUpdate(queryClient, message));
    socket.on('conversation:read', (event) => {
      queryClient.setQueryData<ConversationDetail>(chatKeys.conversation(event.conversationId), (detail) => applyRead(detail, event));
    });
    socket.on('conversation:changed', (event) => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversation(event.conversationId) });
      refreshLists();
    });
    socket.on('conversation:removed', (event) => {
      queryClient.removeQueries({ queryKey: chatKeys.messages(event.conversationId) });
      queryClient.removeQueries({ queryKey: chatKeys.conversation(event.conversationId) });
      refreshLists();
    });
    socket.on('typing', setTyping);
    socket.on('presence', (event) => setPresence(event.userId, event.online));

    return () => disconnectSocket();
  }, [status, queryClient]);

  return <>{children}</>;
}
