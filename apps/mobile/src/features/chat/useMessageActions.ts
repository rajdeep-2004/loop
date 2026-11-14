import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import type { Message, ReactionEmoji } from '@campus/shared';
import { useMe } from '@/features/auth/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { applyReaction, chatKeys, nextReaction, storeMessageUpdate } from './cache';

/**
 * Edit, delete and react. Each call stores the server's answer in the message cache, so the
 * screen updates even if the socket event is late. Failures are shown to the user.
 */
export function useMessageActions() {
  const me = useMe();
  const queryClient = useQueryClient();

  /** Resolves to true when saved. On failure shows the reason and resolves to false. */
  const edit = useCallback(
    async (message: Message, body: string): Promise<boolean> => {
      try {
        storeMessageUpdate(queryClient, await api.patch<Message>(`/messages/${message.id}`, { body }));
        void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
        return true;
      } catch (error) {
        Alert.alert('Message not edited', errorMessage(error));
        return false;
      }
    },
    [queryClient],
  );

  const remove = useCallback(
    async (message: Message): Promise<boolean> => {
      try {
        storeMessageUpdate(queryClient, await api.remove<Message>(`/messages/${message.id}`));
        void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
        return true;
      } catch (error) {
        Alert.alert('Message not deleted', errorMessage(error));
        return false;
      }
    },
    [queryClient],
  );

  /** Tap on an emoji. The change shows at once and is undone if the server refuses it. */
  const react = useCallback(
    async (message: Message, emoji: ReactionEmoji): Promise<void> => {
      const next = nextReaction(message, me.id, emoji);
      storeMessageUpdate(queryClient, applyReaction(message, me.id, next));
      try {
        const path = `/messages/${message.id}/reaction`;
        storeMessageUpdate(queryClient, next ? await api.put<Message>(path, { emoji: next }) : await api.remove<Message>(path));
      } catch (error) {
        storeMessageUpdate(queryClient, message);
        Alert.alert('Reaction not saved', errorMessage(error));
      }
    },
    [queryClient, me.id],
  );

  return { edit, remove, react };
}
