import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { config } from './config.js';
import { httpLogger, errorLoggerMiddleware } from './lib/logger.js';
import { getUploadDir } from './providers/storage.provider.js';

const app = express();

app.use(httpLogger);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = config.WEB_URL.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // In development, allow any localhost port for convenience (3000, 3001, etc.)
      if (config.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Serve locally stored files statically
app.use('/uploads', express.static(getUploadDir()));

app.use('/', routes);

// Error logger middleware (must come after routes)
app.use(errorLoggerMiddleware);

export default app;
