import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import type { InsertUser, User, InsertBattleRequest, BattleRequest } from '../shared/schema';
import { users, battleRequests } from '../shared/schema';
import { eq } from 'drizzle-orm';
import session from 'express-session';
import connectPg from 'connect-pg-simple';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// Create a schema object with all tables
const schema = { users, battleRequests };
export const db = drizzle({ client: pool, schema });

const PostgresSessionStore = connectPg(session);

// Interface for database operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Battle request methods
  createBattleRequest(request: InsertBattleRequest): Promise<BattleRequest>;
  getBattleRequest(id: number): Promise<BattleRequest | undefined>;
  getBattleRequestByToken(token: string): Promise<BattleRequest | undefined>;
  getBattleRequests(): Promise<BattleRequest[]>;
  updateBattleRequestStatus(token: string, status: string): Promise<BattleRequest | undefined>;

  // Session store
  sessionStore: session.Store;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    try {
      this.sessionStore = new PostgresSessionStore({ 
        pool, 
        createTableIfMissing: true 
      });
    } catch (error) {
      console.error("Error initializing PostgresSessionStore:", error);
      // Fallback to in-memory session store for better error recovery
      const MemoryStore = require('memorystore')(session);
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      });
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // Battle request methods
  async createBattleRequest(request: InsertBattleRequest): Promise<BattleRequest> {
    try {
      console.log("Creating battle request with data:", JSON.stringify(request));
      
      // Extract only the properties we need from the request to avoid schema validation issues
      const { name, email, twitchUsername, game, notes, requestedTime, token, status } = request;
      
      // Ensure we have a valid date object
      let requestedDate: Date;
      try {
        if (request.requestedDate instanceof Date) {
          requestedDate = request.requestedDate;
        } else {
          requestedDate = new Date(request.requestedDate);
        }
        
        if (isNaN(requestedDate.getTime())) {
          console.log("Invalid date received, using current date as fallback");
          requestedDate = new Date(); // Fallback to current date
        }
      } catch (dateError) {
        console.error("Error parsing date:", dateError);
        requestedDate = new Date(); // Fallback to current date
      }
      
      // Create the request with validated properties
      const [battleRequest] = await db.insert(battleRequests).values({
        name,
        email,
        twitchUsername,
        game,
        notes,
        requestedTime,
        requestedDate,
        token,
        status
      }).returning();
      
      console.log("Battle request created with ID:", battleRequest.id);
      return battleRequest;
    } catch (error) {
      console.error("Error creating battle request:", error);
      throw error;
    }
  }

  async getBattleRequest(id: number): Promise<BattleRequest | undefined> {
    try {
      const [request] = await db.select().from(battleRequests).where(eq(battleRequests.id, id));
      return request;
    } catch (error) {
      console.error("Error getting battle request by ID:", error);
      return undefined;
    }
  }

  async getBattleRequestByToken(token: string): Promise<BattleRequest | undefined> {
    try {
      const [request] = await db.select().from(battleRequests).where(eq(battleRequests.token, token));
      return request;
    } catch (error) {
      console.error("Error getting battle request by token:", error);
      return undefined;
    }
  }

  async getBattleRequests(): Promise<BattleRequest[]> {
    try {
      return await db.select().from(battleRequests).orderBy(battleRequests.requestedDate);
    } catch (error) {
      console.error("Error getting all battle requests:", error);
      return [];
    }
  }

  async updateBattleRequestStatus(token: string, status: string): Promise<BattleRequest | undefined> {
    try {
      const [updatedRequest] = await db
        .update(battleRequests)
        .set({ status })
        .where(eq(battleRequests.token, token))
        .returning();
      
      return updatedRequest;
    } catch (error) {
      console.error("Error updating battle request status:", error);
      return undefined;
    }
  }
}

// Export a singleton instance
export const storage = new DatabaseStorage();