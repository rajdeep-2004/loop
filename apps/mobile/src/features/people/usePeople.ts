import { useInfiniteQuery } from '@tanstack/react-query';
import type { PublicUser } from '@campus/shared';
import { api } from '@/lib/api';

export type PeopleFilter = { q?: string; schoolId?: string | null; programId?: string | null; year?: number | null; tag?: string | null };

export function peoplePath(filter: PeopleFilter, cursor?: string): string {
  const params = new URLSearchParams();
  if (filter.q?.trim()) params.set('q', filter.q.trim());
  if (filter.schoolId) params.set('schoolId', filter.schoolId);
  if (filter.programId) params.set('programId', filter.programId);
  if (filter.year) params.set('year', String(filter.year));
  if (filter.tag?.trim()) params.set('tag', filter.tag.trim().toLowerCase());
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  return query ? `/users?${query}` : '/users';
}

export function usePeople(filter: PeopleFilter, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['people', filter],
    queryFn: ({ pageParam }) => api.page<PublicUser>(peoplePath(filter, pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}
