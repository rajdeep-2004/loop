import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import type { ConversationSummary, PublicUser } from '@campus/shared';
import { useMe } from '@/features/auth/AuthContext';
import { ProfileCard } from '@/features/profile/ProfileCard';
import { useOnline } from '@/features/realtime/liveState';
import { api, errorMessage } from '@/lib/api';
import { Button, ErrorState, Loading, Screen, Tag, TopBar, Txt, colors } from '@/ui';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const user = useQuery({ queryKey: ['user', id], queryFn: () => api.get<PublicUser & { online: boolean }>(`/users/${id}`) });
  const online = useOnline(id, user.data?.online);
  const [opening, setOpening] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const message = async () => {
    setOpening(true);
    setFailure(null);
    try {
      const conversation = await api.post<ConversationSummary>('/conversations/dm', { userId: id });
      router.push(`/chat/${conversation.id}`);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setOpening(false);
    }
  };

  return (
    <Screen padded={false}>
      <TopBar title="Profile" back right={online ? <Tag label="Online" color={colors.mint} /> : null} />
      {user.isPending ? (
        <Loading />
      ) : user.isError ? (
        <ErrorState message={errorMessage(user.error)} onRetry={() => user.refetch()} />
      ) : (
        <Screen scroll edges={[]}>
          <ProfileCard user={user.data} />
          {failure ? <Txt color={colors.red} accessibilityRole="alert">{failure}</Txt> : null}
          {user.data.id !== me.id ? <Button label="Message" onPress={message} loading={opening} /> : null}
        </Screen>
      )}
    </Screen>
  );
}
