import express from 'express';
import session from 'express-session';
import { createServer } from 'http';
import connectPg from 'connect-pg-simple';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { registerRoutes } from '../server/routes';

const PostgresSessionStore = connectPg(session);
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
});

// Create Express server
const app = express();
app.use(express.json());

// Initialize session store
const sessionStore = new PostgresSessionStore({
  pool,
  createTableIfMissing: true
});

// Initialize session
const sessionOptions: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(session(sessionOptions));

// Register API routes
const server = createServer(app);
registerRoutes(app);

// Export the Express API
export default app;