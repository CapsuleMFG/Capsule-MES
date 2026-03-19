import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import profilesRouter from './routes/profiles.routes';
import auditLogRouter from './routes/audit-log.routes';
import productionDashboardRouter from './routes/production-dashboard.routes';
import reportsRouter from './routes/reports.routes';
import schedulingRouter from './routes/scheduling.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow multiple localhost ports for development
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Auth middleware — applied globally, behavior controlled by AUTH_REQUIRED env var
app.use(authMiddleware);

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
app.use('/api/dashboard/production', productionDashboardRouter);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);

    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
});

// Initialize database and start server
async function startServer() {
    try {
        console.log('Initializing database...');
        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║           CAPSULE ERP SERVER RUNNING                   ║
║                                                        ║
║   Server: http://localhost:${PORT}                      ║
║   Health: http://localhost:${PORT}/health               ║
║   API:    http://localhost:${PORT}/api                  ║
║                                                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down gracefully...');
    closeDatabase();
    process.exit(0);
});

// Start the server
startServer();

export default app;
