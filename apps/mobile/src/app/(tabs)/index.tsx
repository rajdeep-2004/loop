import { router } from 'expo-router';
import { FlatList, RefreshControl } from 'react-native';
import { ConversationRow } from '@/features/chat/ConversationRow';
import { useConversations } from '@/features/chat/hooks';
import { errorMessage } from '@/lib/api';
import { Button, EmptyState, ErrorState, Loading, Screen, TopBar, colors } from '@/ui';

export default function Chats() {
  const conversations = useConversations();
  const rows = conversations.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen padded={false}>
      <TopBar title="Chats" right={<Button label="New" small onPress={() => router.push('/people/new')} />} />
      {conversations.isPending ? (
        <Loading label="Loading chats" />
      ) : conversations.isError ? (
        <ErrorState message={errorMessage(conversations.error)} onRetry={() => conversations.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No chats yet" hint="Tap New to find someone and say hello." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(conversation) => conversation.id}
          renderItem={({ item }) => <ConversationRow conversation={item} onPress={() => router.push(`/chat/${item.id}`)} />}
          onEndReached={() => conversations.hasNextPage && !conversations.isFetchingNextPage && conversations.fetchNextPage()}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={conversations.isRefetching} onRefresh={() => void conversations.refetch()} tintColor={colors.ink} />}
        />
      )}
    </Screen>
  );
}
