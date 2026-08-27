import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import puzzleRoutes from './routes/puzzle.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import apiRoutes from './routes/api.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const app = express();

// View engine setup (EJS)
app.set('views', path.join(rootDir, 'views'));
app.set('view engine', 'ejs');

// Core Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from /public
app.use(express.static(path.join(rootDir, 'public')));

// Mount Routes
app.use('/', authRoutes);
app.use('/puzzle', puzzleRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/api', apiRoutes);

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
