import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';

// Set up WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

// Initialize database connection
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Initialize Resend for email
const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'default@example.com';

// Create database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Format date for email display
function formatDate(date: Date | string): string {
  let dateObj: Date;
  try {
    if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return String(date);
  }
}

// Send email notification
async function sendBattleRequestEmail(request: any): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("Skipping email: RESEND_API_KEY not configured");
    return;
  }

  const formattedDate = formatDate(request.requestedDate);
  const confirmUrl = `https://pelletion.vercel.app/api/battle-requests-confirm?token=${request.token}&action=confirm`;
  const rejectUrl = `https://pelletion.vercel.app/api/battle-requests-confirm?token=${request.token}&action=reject`;

  try {
    await resend.emails.send({
      from: 'Pelletion Battle Request <onboarding@resend.dev>',
      to: [ADMIN_EMAIL],
      subject: `New Battle Request: ${request.name} - ${formattedDate}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6d28d9;">New Battle Request</h1>
          
          <div style="background-color: #f4f4f5; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <p><strong>From:</strong> ${request.name}</p>
            <p><strong>Email:</strong> ${request.email}</p>
            <p><strong>Twitch Username:</strong> ${request.twitchUsername}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${request.requestedTime}</p>
            <p><strong>Game:</strong> ${request.game}</p>
            ${request.notes ? `<p><strong>Notes:</strong> ${request.notes}</p>` : ''}
          </div>
          
          <div style="margin-bottom: 20px;">
            <p>Would you like to accept or decline this battle request?</p>
            
            <div style="display: flex; gap: 10px;">
              <a href="${confirmUrl}" style="display: inline-block; padding: 10px 20px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px;">Accept</a>
              <a href="${rejectUrl}" style="display: inline-block; padding: 10px 20px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px;">Decline</a>
            </div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            © ${new Date().getFullYear()} Pelletion. All rights reserved.
          </p>
        </div>
      `,
    });
    
    console.log(`Battle request email sent to admin for ${request.name}'s request`);
  } catch (error) {
    console.error('Error sending battle request email:', error);
  }
}

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

// Create a new battle request
async function createBattleRequest(data: any) {
  try {
    // Ensure we have a valid date
    let requestedDate;
    try {
      requestedDate = new Date(data.requestedDate);
      if (isNaN(requestedDate.getTime())) {
        requestedDate = new Date();
      }
    } catch (error) {
      requestedDate = new Date();
    }

    // Create the battle request
    const result = await db.execute(
      `INSERT INTO "battleRequests" ("name", "email", "twitchUsername", "game", "notes", "requestedDate", "requestedTime", "token", "status") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        data.name,
        data.email,
        data.twitchUsername,
        data.game,
        data.notes,
        requestedDate,
        data.requestedTime,
        data.token,
        data.status
      ]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating battle request:', error);
    throw error;
  }
}

// Update battle request status
async function updateBattleRequestStatus(token: string, status: string) {
  try {
    const result = await db.execute(
      `UPDATE "battleRequests" SET "status" = $1 WHERE "token" = $2 RETURNING *`,
      [status, token]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error updating battle request:', error);
    return null;
  }
}

export default async function handler(req: Request, res: Response) {
  try {
    // GET request to fetch all battle requests
    if (req.method === 'GET') {
      try {
        const battleRequests = await getBattleRequests();
        return res.json(battleRequests);
      } catch (error) {
        console.error("Error fetching battle requests:", error);
        return res.status(500).json({ error: "Failed to fetch battle requests" });
      }
    }
    
    // POST request to create a new battle request
    else if (req.method === 'POST') {
      try {
        console.log("Received battle request data:", JSON.stringify(req.body));
        
        // Generate a unique token for this request
        const token = randomBytes(32).toString('hex');
        
        // Extract data from request body directly, with fallbacks for safety
        const requestData = {
          name: req.body.name || 'Anonymous',
          email: req.body.email || 'no-email@example.com',
          twitchUsername: req.body.twitchUsername || '',
          game: req.body.game || 'Not specified',
          notes: req.body.notes || '',
          requestedDate: new Date(req.body.requestedDate || Date.now()),
          requestedTime: req.body.requestedTime || 'Not specified',
          token,
          status: 'pending',
        };
        
        console.log("Processed battle request data:", JSON.stringify(requestData));
        
        // Create the battle request
        const createdRequest = await createBattleRequest(requestData);
        console.log(`Battle request created with ID: ${createdRequest.id}`);
        
        // Send email notification (don't await)
        try {
          console.log(`Sending battle request notification to admin for ${createdRequest.name}'s request`);
          sendBattleRequestEmail(createdRequest).catch(err => {
            console.error("Async email error:", err);
          });
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
          // Continue anyway - don't fail the request if email fails
        }
        
        return res.status(201).json(createdRequest);
      } catch (error) {
        console.error("Error creating battle request:", error);
        return res.status(500).json({ 
          error: "Failed to create battle request",
          message: error.message || "Unknown error" 
        });
      }
    }
    
    // POST method with update-status path to provide consistent API with the server
    else if (req.method === 'POST' && req.url?.includes('update-status')) {
      try {
        console.log("Received status update data:", JSON.stringify(req.body));
        
        // Extract data directly from the request body
        const token = req.body.token;
        const status = req.body.status;
        
        if (!token || !status) {
          return res.status(400).json({ error: "Token and status are required" });
        }
        
        if (!['pending', 'confirmed', 'rejected'].includes(status)) {
          return res.status(400).json({ error: "Status must be 'pending', 'confirmed', or 'rejected'" });
        }
        
        // Update the battle request status
        const updatedRequest = await updateBattleRequestStatus(token, status);
        
        if (!updatedRequest) {
          console.error(`Battle request with token ${token} not found`);
          return res.status(404).json({ error: "Battle request not found" });
        }
        
        console.log(`Battle request status updated to ${status} for ID: ${updatedRequest.id}`);
        return res.json(updatedRequest);
      } catch (error) {
        console.error("Error updating battle request status:", error);
        return res.status(500).json({ 
          error: "Failed to update battle request status",
          message: error.message || "Unknown error"
        });
      }
    }
    
    // Method not allowed
    else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (outerError) {
    console.error("Unhandled exception in battle-requests API:", outerError);
    return res.status(500).json({ 
      error: "Server error processing battle request", 
      message: outerError.message || "Unknown error" 
    });
  } finally {
    // Always ensure we release the database connection
    // pool.end(); // Don't end the pool in serverless functions
  }
}