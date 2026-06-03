import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { httpMetricsMiddleware, metricsRegister, updateBusinessMetrics } from './metrics';

import authRoutes from './routes/auth';
import equipmentRoutes from './routes/equipment';
import employeesRoutes from './routes/employees';
import issuancesRoutes from './routes/issuances';
import dashboardRoutes from './routes/dashboard';
import backupRoutes from './routes/backup';
import referenceRoutes from './routes/references';
import repairsRoutes from './routes/repairs';
import inventoryRoutes from './routes/inventoryChecks';
import reportsRoutes from './routes/reports';
import auditRoutes from './routes/auditLog';
import notificationsRoutes from './routes/notifications';
import usersRoutes from './routes/users';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS origin not allowed: ${origin}`));
      },
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(httpMetricsMiddleware);

  app.use('/api/auth', authRoutes);
  app.use('/api/equipment', equipmentRoutes);
  app.use('/api/employees', employeesRoutes);
  app.use('/api/issuances', issuancesRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/backup', backupRoutes);
  app.use('/api/references', referenceRoutes);
  app.use('/api/repairs', repairsRoutes);
  app.use('/api/inventory-checks', inventoryRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/audit-log', auditRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/admin/users', usersRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'equipment-control-api',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/metrics', async (_req, res) => {
    await updateBusinessMetrics();
    res.set('Content-Type', metricsRegister.contentType);
    res.end(await metricsRegister.metrics());
  });

  app.use(errorHandler);

  return app;
}
