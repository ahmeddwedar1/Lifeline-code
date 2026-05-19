import http from 'http';
import app from './app';
import { config } from './config';
import prisma from './infrastructure/database/prisma';
import { connectRedis, disconnectRedis } from './infrastructure/redis/client';
import { setupWebSocket } from './infrastructure/websocket/index';
import { setupWorkers } from './infrastructure/queues';
import { logger } from './shared/utils/logger';

let server: http.Server;

async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    await connectRedis();

    server = http.createServer(app);

    const io = setupWebSocket(server);
    logger.info('WebSocket server initialized');

    setupWorkers();
    logger.info('Queue workers initialized');

    server.listen(config.port, () => {
      logger.info(`LifeLine API server running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Health check: http://localhost:${config.port}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down gracefully...');

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  await disconnectRedis();

  await prisma.$disconnect();
  logger.info('Database disconnected');

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

bootstrap();

export default app;
