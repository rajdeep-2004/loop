import type { Server } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@campus/shared';

export type CampusServer = Server<ClientEvents, ServerEvents>;

let io: CampusServer | null = null;
/** userId -> number of open sockets. In memory: correct while the API is a single process. */
const openSockets = new Map<string, number>();

export const userRoom = (userId: string) => `user:${userId}`;

export function setIo(server: CampusServer | null): void {
  io = server;
  if (!server) openSockets.clear();
}

/**
 * Delivers one event to every socket of the given users. Services call this with the
 * current member list, so membership changes never need socket-room bookkeeping.
 */
export function emitToUsers<E extends keyof ServerEvents>(
  userIds: Iterable<string>,
  event: E,
  ...args: Parameters<ServerEvents[E]>
): void {
  if (!io) return;
  const rooms = [...new Set(userIds)].map(userRoom);
  if (rooms.length === 0) return;
  io.to(rooms).emit(event, ...args);
}

export const isOnline = (userId: string) => (openSockets.get(userId) ?? 0) > 0;

/** Returns true when this is the user's first open socket (they just came online). */
export function trackConnect(userId: string): boolean {
  const count = (openSockets.get(userId) ?? 0) + 1;
  openSockets.set(userId, count);
  return count === 1;
}

/** Returns true when the user's last socket closed (they just went offline). */
export function trackDisconnect(userId: string): boolean {
  const count = (openSockets.get(userId) ?? 1) - 1;
  if (count <= 0) {
    openSockets.delete(userId);
    return true;
  }
  openSockets.set(userId, count);
  return false;
}
