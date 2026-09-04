import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';
import paperRoutes from './routes/paperRoutes.js';
import graphRoutes from './routes/graphRoutes.js';
import signalRoutes from './routes/signalRoutes.js';
import gapRoutes from './routes/gapRoutes.js';
import validationRoutes from './routes/validationRoutes.js';
import opportunityRoutes from './routes/opportunityRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import errorHandler from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';



// Standard Middlewares
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check API
app.get('/api/v1/health', (_req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'ideaforge-api'
  });
});

// App Router Connections
app.use('/api/v1/papers', paperRoutes);
app.use('/api/v1/graph', graphRoutes);
app.use('/api/v1/signals', signalRoutes);
app.use('/api/v1/gaps', gapRoutes);
app.use('/api/v1', validationRoutes);
app.use('/api/v1/opportunities', opportunityRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Fallback Route Handler (404 Not Found)
app.use((_req, res) => {
  return res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested route does not exist.'
    }
  });
});

// Central Error Handler Middleware
app.use(errorHandler);

// Establish Server and Database Connection
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server successfully started on port ${PORT}`);
  console.log(`CORS origin allowed: ${CLIENT_URL}`);
});

connectDatabase().catch(error => {
  console.warn('MongoDB initial connection attempt failed. Background retries will continue:', error.message);
});
