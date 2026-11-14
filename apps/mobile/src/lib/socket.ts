import { io, type Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents } from '@campus/shared';
import { refreshSession } from './api';
import { API_URL } from './config';
import { getAccessToken } from './tokens';

export type CampusSocket = Socket<ServerEvents, ClientEvents>;

let socket: CampusSocket | null = null;

export const getSocket = () => socket;

/** Opens the one shared socket. The token is read at every (re)connect, so it is always the current one. */
export function connectSocket(): CampusSocket {
  if (socket) return socket;
  const created: CampusSocket = io(API_URL, {
    transports: ['websocket'],
    auth: (callback) => callback({ token: getAccessToken() }),
    reconnectionDelayMax: 5000,
  });
  // The server refuses the handshake when the access token has expired. Socket.IO
  // does not retry a refused handshake, so refresh the token and connect again.
  created.on('connect_error', async (error) => {
    if (error.message !== 'auth_expired' && error.message !== 'unauthorized') return;
    if (socket === created && (await refreshSession())) created.connect();
  });
  socket = created;
  return created;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
