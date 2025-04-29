import { battleRequests, type BattleRequest, type InsertBattleRequest, type User, type InsertUser, users } from "@shared/schema";
import crypto from "crypto";
import { db } from "./db";
import { eq, asc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Interface for storage operations
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

// PostgreSQL Database Storage Implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Battle request methods
  async createBattleRequest(request: InsertBattleRequest): Promise<BattleRequest> {
    const token = crypto.randomBytes(32).toString('hex');
    const status = "pending";
    
    // Convert string date to Date object if needed
    let requestedDate: Date;
    if (typeof request.requestedDate === 'string') {
      requestedDate = new Date(request.requestedDate);
    } else {
      requestedDate = request.requestedDate;
    }
    
    // Ensure notes is never undefined (null is allowed)
    const notes = request.notes === undefined ? null : request.notes;
    
    const [battleRequest] = await db.insert(battleRequests).values({
      name: request.name,
      email: request.email,
      twitchUsername: request.twitchUsername,
      game: request.game,
      notes: notes,
      requestedDate: requestedDate,
      requestedTime: request.requestedTime,
      status,
      token
    }).returning();
    
    return battleRequest;
  }

  async getBattleRequest(id: number): Promise<BattleRequest | undefined> {
    const [request] = await db.select().from(battleRequests).where(eq(battleRequests.id, id));
    return request;
  }

  async getBattleRequestByToken(token: string): Promise<BattleRequest | undefined> {
    const [request] = await db.select().from(battleRequests).where(eq(battleRequests.token, token));
    return request;
  }

  async getBattleRequests(): Promise<BattleRequest[]> {
    const requests = await db.select().from(battleRequests);
    
    // Sort the results manually
    return requests.sort((a, b) => {
      // Sort by date first
      const dateA = new Date(a.requestedDate).getTime();
      const dateB = new Date(b.requestedDate).getTime();
      
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      
      // Then by time
      return a.requestedTime.localeCompare(b.requestedTime);
    });
  }

  async updateBattleRequestStatus(token: string, status: string): Promise<BattleRequest | undefined> {
    const [updatedRequest] = await db.update(battleRequests)
      .set({ status })
      .where(eq(battleRequests.token, token))
      .returning();
    
    return updatedRequest;
  }
}

// In-Memory Storage Implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private battleRequests: Map<number, BattleRequest>;
  private userIdCounter: number;
  private battleRequestIdCounter: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.battleRequests = new Map();
    this.userIdCounter = 1;
    this.battleRequestIdCounter = 1;

    const MemoryStore = require('memorystore')(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Battle request methods
  async createBattleRequest(request: InsertBattleRequest): Promise<BattleRequest> {
    const id = this.battleRequestIdCounter++;
    const token = crypto.randomBytes(32).toString('hex');
    const status = "pending";
    const createdAt = new Date();
    
    // Convert string date to Date object if needed
    let requestedDate: Date;
    if (typeof request.requestedDate === 'string') {
      requestedDate = new Date(request.requestedDate);
    } else {
      requestedDate = request.requestedDate;
    }
    
    // Ensure notes is never undefined (null is allowed)
    const notes = request.notes === undefined ? null : request.notes;
    
    // Create battle request without using spread to avoid type issues
    const battleRequest: BattleRequest = {
      id,
      name: request.name,
      email: request.email,
      twitchUsername: request.twitchUsername,
      game: request.game,
      notes: notes,
      requestedDate: requestedDate,
      requestedTime: request.requestedTime,
      status,
      token,
      createdAt,
    };
    
    this.battleRequests.set(id, battleRequest);
    return battleRequest;
  }

  async getBattleRequest(id: number): Promise<BattleRequest | undefined> {
    return this.battleRequests.get(id);
  }

  async getBattleRequestByToken(token: string): Promise<BattleRequest | undefined> {
    return Array.from(this.battleRequests.values()).find(
      (request) => request.token === token,
    );
  }

  async getBattleRequests(): Promise<BattleRequest[]> {
    return Array.from(this.battleRequests.values()).sort((a, b) => {
      // Sort by date, then by time
      const dateA = new Date(a.requestedDate).getTime();
      const dateB = new Date(b.requestedDate).getTime();
      
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      
      return a.requestedTime.localeCompare(b.requestedTime);
    });
  }

  async updateBattleRequestStatus(token: string, status: string): Promise<BattleRequest | undefined> {
    const request = await this.getBattleRequestByToken(token);
    
    if (!request) {
      return undefined;
    }
    
    const updatedRequest: BattleRequest = {
      ...request,
      status,
    };
    
    this.battleRequests.set(request.id, updatedRequest);
    return updatedRequest;
  }
}

// Create and export an instance of the DatabaseStorage class
export const storage = new DatabaseStorage();
