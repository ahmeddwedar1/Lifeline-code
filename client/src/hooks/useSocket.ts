'use client';

import { useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

interface SocketHookOptions {
  onNotification?: (data: any) => void;
  onEmergencyUpdate?: (data: any) => void;
  onLocationUpdate?: (data: any) => void;
  onResourceChange?: (data: any) => void;
}

export function useSocket(options: SocketHookOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('notification:new', (data) => {
      options.onNotification?.(data);
    });

    socket.on('emergency:status_update', (data) => {
      options.onEmergencyUpdate?.(data);
    });

    socket.on('ambulance:location_update', (data) => {
      options.onLocationUpdate?.(data);
    });

    socket.on('resource:availability_change', (data) => {
      options.onResourceChange?.(data);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const joinHospitalRoom = useCallback((hospitalId: string) => {
    socketRef.current?.emit('room:join_hospital', hospitalId);
  }, []);

  const leaveHospitalRoom = useCallback((hospitalId: string) => {
    socketRef.current?.emit('room:leave_hospital', hospitalId);
  }, []);

  const trackAmbulance = useCallback((ambulanceId: string) => {
    socketRef.current?.emit('ambulance:track', ambulanceId);
  }, []);

  return {
    socket: socketRef.current,
    joinHospitalRoom,
    leaveHospitalRoom,
    trackAmbulance,
  };
}
