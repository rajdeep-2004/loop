import { FlatList } from 'react-native';
import type { PublicUser } from '@campus/shared';
import { errorMessage } from '@/lib/api';
import { EmptyState, ErrorState, Loading } from '@/ui';
import { PersonRow } from './PersonRow';
import { usePeople, type PeopleFilter } from './usePeople';

type Props = { filter: PeopleFilter; onPick: (person: PublicUser) => void; renderRight?: (person: PublicUser) => React.ReactNode; emptyHint?: string };

/** Search results with loading, error, empty and paged states. */
export function PeopleList({ filter, onPick, renderRight, emptyHint = 'Try a different name or filter.' }: Props) {
  const people = usePeople(filter);
  if (people.isPending) return <Loading label="Searching" />;
  if (people.isError) return <ErrorState message={errorMessage(people.error)} onRetry={() => people.refetch()} />;
  const rows = people.data.pages.flatMap((page) => page.data);
  if (rows.length === 0) return <EmptyState title="Nobody found" hint={emptyHint} />;
  return (
    <FlatList
      data={rows}
      keyExtractor={(person) => person.id}
      renderItem={({ item }) => <PersonRow person={item} onPress={() => onPick(item)} right={renderRight?.(item)} />}
      onEndReached={() => people.hasNextPage && !people.isFetchingNextPage && people.fetchNextPage()}
      onEndReachedThreshold={0.4}
      keyboardShouldPersistTaps="handled"
    />
  );
}
