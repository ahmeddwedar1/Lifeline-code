import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler, notFoundHandler } from './shared/middleware/error.middleware';
import { apiRateLimiter } from './shared/middleware/rateLimiter';
import routes from './routes';
import { logger } from './shared/utils/logger';
import swaggerUi from 'swagger-ui-express';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', apiRateLimiter);

app.use('/api', routes);

// Swagger documentation
if (config.swagger.enabled) {
  try {
    const swaggerDocument = require('../swagger.json');
    app.use(config.swagger.path, swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    logger.info(`Swagger docs available at ${config.swagger.path}`);
  } catch {
    logger.warn('Swagger documentation not found, skipping');
  }
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
