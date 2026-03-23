import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './models/database';
import jobsRouter from './routes/jobs.routes';
import dashboardRouter from './routes/dashboard.routes';
import clientsRouter from './routes/clients.routes';
import workflowRouter from './routes/workflow.routes';
import suppliersRouter from './routes/suppliers.routes';
import inventoryRouter from './routes/inventory.routes';
import engineeringRouter from './routes/engineering.routes';
import machinesRouter from './routes/machines.routes';
import productionRouter from './routes/production.routes';
import routeTemplatesRouter from './routes/route-templates.routes';
import trackedPartsRouter from './routes/tracked-parts.routes';
import stationKiosksRouter from './routes/station-kiosks.routes';
import engineersRouter from './routes/engineers.routes';
import pbomOrdersRouter from './routes/pbom-orders.routes';
import supplyChainRouter from './routes/supplychain.routes';
import purchaseOrdersRouter from './routes/purchase-orders.routes';
import { authMiddleware } from './middleware/auth';
import { operatorScope } from './middleware/operatorScope';
import { logger, httpLogger } from './lib/logger';
import profilesRouter from './routes/profiles.routes';
import auditLogRouter from './routes/audit-log.routes';
import productionDashboardRouter from './routes/production-dashboard.routes';
import reportsRouter from './routes/reports.routes';
import schedulingRouter from './routes/scheduling.routes';
import shippingRouter from './routes/shipping.routes';
import notificationsRouter from './routes/notifications.routes';
import downtimeRouter from './routes/downtime.routes';
import authRouter from './routes/auth.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow multiple localhost ports for development
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://10.0.1.213:5173',
    'http://localhost:3000'
];

// Middleware
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin only in development (Postman, etc.)
        if (!origin) return callback(null, process.env.NODE_ENV !== 'production');

        // Allow any localhost origin in development
        if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }

        // Check against allowed origins
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // generous limit for ERP usage
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
    skip: (req) => req.path === '/health', // don't rate limit health checks
});
app.use('/api/', apiLimiter);

// Structured request logging
app.use(httpLogger);

// Auth routes — mounted BEFORE authMiddleware since login/forgot-password are unauthenticated
app.use('/api/auth', authRouter);

// Auth middleware — applied globally, behavior controlled by AUTH_REQUIRED env var
app.use(authMiddleware);
app.use(operatorScope);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/jobs', jobsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/workflow', workflowRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/machines', machinesRouter);
app.use('/api/production', productionRouter);
app.use('/api', engineeringRouter);
app.use('/api/route-templates', routeTemplatesRouter);
app.use('/api/tracked-parts', trackedPartsRouter);
app.use('/api/station-kiosks', stationKiosksRouter);
app.use('/api/engineers', engineersRouter);
app.use('/api/pbom/orders', pbomOrdersRouter);
app.use('/api/supply-chain', supplyChainRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/audit-log', auditLogRouter);
app.use('/api/dashboard/production', productionDashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/scheduling', schedulingRouter);
app.use('/api/shipments', shippingRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/downtime', downtimeRouter);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });

    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
});

// Initialize database and start server
async function startServer() {
    try {
        // Production safety: refuse to start without auth properly configured
        if (process.env.NODE_ENV === 'production') {
          if (!process.env.SUPABASE_URL) {
            logger.error('FATAL: SUPABASE_URL is not set. Cannot start in production without auth backend.');
            process.exit(1);
          }
          if (process.env.AUTH_REQUIRED?.toLowerCase() !== 'true') {
            logger.error('FATAL: AUTH_REQUIRED must be "true" in production. Dev bypass would be active.');
            process.exit(1);
          }
        }

        logger.info('Initializing database...');
        await initializeDatabase();

        app.listen(PORT, () => {
            logger.info(`Capsule ERP server running`, {
                port: PORT,
                env: process.env.NODE_ENV || 'development',
                health: `http://localhost:${PORT}/health`,
            });
        });
    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Shutting down gracefully...');
    closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Shutting down gracefully...');
    closeDatabase();
    process.exit(0);
});

// Start the server
startServer();

export default app;
