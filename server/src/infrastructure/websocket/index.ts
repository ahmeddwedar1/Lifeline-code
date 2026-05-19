import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyTokenSocket } from '../../shared/middleware/auth.middleware';
import { config } from '../../config';

let io: Server | null = null;

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function setupWebSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token as string;
      if (token) {
        const user = await verifyTokenSocket(token);
        (socket as any).user = user;
      }
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`Socket connected: ${socket.id} (user: ${user?.id || 'anonymous'})`);

    if (user) {
      socket.join(`user:${user.id}`);
      socket.join(`role:${user.role}`);
    }

    socket.on('ambulance:track', (ambulanceId: string) => {
      socket.join(`ambulance:${ambulanceId}`);
    });

    socket.on('room:join_hospital', (hospitalId: string) => {
      if (user?.role === 'HOSPITAL' || user?.role === 'DOCTOR' || user?.role === 'ADMIN') {
        socket.join(`hospital:${hospitalId}`);
      }
    });

    socket.on('room:leave_hospital', (hospitalId: string) => {
      socket.leave(`hospital:${hospitalId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function emitToUser(userId: string, event: string, data: any): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToRole(role: string, event: string, data: any): void {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
}

export function emitToHospital(hospitalId: string, event: string, data: any): void {
  if (io) {
    io.to(`hospital:${hospitalId}`).emit(event, data);
  }
}

export function emitToAmbulance(ambulanceId: string, event: string, data: any): void {
  if (io) {
    io.to(`ambulance:${ambulanceId}`).emit(event, data);
  }
}
