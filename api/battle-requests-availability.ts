import type { Request, Response } from 'express';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

// Define time slots from 2 PM to midnight
const DEFAULT_TIME_SLOTS = [
  "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", 
  "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM"
];

// Set up WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

// Initialize database connection
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Create database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Get all battle requests
async function getBattleRequests() {
  try {
    // SQL query to get all battle requests
    const result = await db.execute(
      `SELECT * FROM "battleRequests" ORDER BY "requestedDate" ASC`
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching battle requests:', error);
    return [];
  }
}

export default async function handler(req: Request, res: Response) {
  // Make sure it's a GET request
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dateStr = req.query.date as string;
    
    if (!dateStr) {
      console.error("Date parameter missing in availability request");
      // Return all time slots as available instead of error
      return res.json(DEFAULT_TIME_SLOTS.map(time => ({ time, available: true })));
    }
    
    const date = new Date(dateStr);
    console.log(`Processing availability request for date: ${dateStr}`);
    
    // Get all battle requests for validation
    try {
      const allRequests = await getBattleRequests();
      console.log(`Found ${allRequests.length} battle requests to check against`);
      
      // Format the requested date for comparison
      const formattedDate = date.toISOString().split('T')[0];
      
      // Check which slots are already taken
      const result = DEFAULT_TIME_SLOTS.map(time => {
        // Check if this slot is already taken or pending for the requested date
        const isTaken = allRequests.some(request => {
          // Make sure request.requestedDate is treated as a Date
          const requestDate = new Date(request.requestedDate).toISOString().split('T')[0];
          return requestDate === formattedDate && 
                 request.requestedTime === time && 
                 (request.status === 'confirmed' || request.status === 'pending');
        });
        
        return {
          time,
          available: !isTaken
        };
      });
      
      console.log(`Returning ${result.filter(slot => slot.available).length} available time slots`);
      return res.json(result);
    } catch (storageError) {
      console.error("Error accessing battle requests from storage:", storageError);
      // Return all time slots as available on storage error
      return res.json(DEFAULT_TIME_SLOTS.map(time => ({ time, available: true })));
    }
  } catch (error) {
    console.error("Error checking time slot availability:", error);
    // Always return time slots instead of an error
    return res.json(DEFAULT_TIME_SLOTS.map(time => ({ time, available: true })));
  } finally {
    // Always ensure we release the database connection
    // pool.end(); // Don't end the pool in serverless functions
  }
}