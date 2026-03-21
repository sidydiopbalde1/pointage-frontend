import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let sharedSocket: Socket | null = null;
const listeners: Map<string, Set<(data: unknown) => void>> = new Map();

function getSocket(): Socket {
  if (!sharedSocket || !sharedSocket.connected) {
    const token = localStorage.getItem('accessToken');
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace('/api', '');
    sharedSocket = io(`${baseUrl}/dashboard`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });
    sharedSocket.onAny((event: string, data: unknown) => {
      listeners.get(event)?.forEach((cb) => cb(data));
    });
  }
  return sharedSocket;
}

export function useSocket<T = unknown>(event: string, callback: (data: T) => void) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const socket = getSocket();

    const handler = (data: unknown) => cbRef.current(data as T);
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(handler);
    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
      listeners.get(event)?.delete(handler);
    };
  }, [event]);
}

/** Legacy export – kept for backward compatibility */
export function useDashboardSocket(onUpdate: (data: unknown) => void) {
  useSocket('attendance:update', onUpdate);
  useSocket('stats:update', onUpdate);
}
