import type { Request, Response } from 'express';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { Resend } from 'resend';

// Set up WebSocket for Neon database
neonConfig.webSocketConstructor = ws;

// Initialize database connection
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Initialize Resend for email
const resend = new Resend(process.env.RESEND_API_KEY);

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

// Get battle request by token
async function getBattleRequestByToken(token: string) {
  try {
    // Use direct SQL with properly quoted values
    const escapedToken = token.replace(/'/g, "''");
    
    const result = await db.execute(`
      SELECT * FROM "battleRequests" 
      WHERE "token" = '${escapedToken}' 
      LIMIT 1
    `);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching battle request by token:', error);
    return null;
  }
}

// Update battle request status
async function updateBattleRequestStatus(token: string, status: string) {
  try {
    // Use direct SQL with properly quoted values
    const escapedToken = token.replace(/'/g, "''");
    const escapedStatus = status.replace(/'/g, "''");
    
    const result = await db.execute(`
      UPDATE "battleRequests" 
      SET "status" = '${escapedStatus}' 
      WHERE "token" = '${escapedToken}' 
      RETURNING *
    `);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error updating battle request:', error);
    return null;
  }
}

// Send confirmation email
async function sendConfirmationEmail(request: any): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("Skipping email: RESEND_API_KEY not configured");
    return;
  }

  const formattedDate = formatDate(request.requestedDate);
  
  try {
    await resend.emails.send({
      from: 'Pelletion Battle Confirmation <onboarding@resend.dev>',
      to: [request.email],
      subject: `Battle Request Confirmed - ${formattedDate} at ${request.requestedTime}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Battle Request Confirmed!</h1>
          
          <p>Hi ${request.name},</p>
          
          <p>Great news! Your battle request has been <strong>confirmed</strong>.</p>
          
          <div style="background-color: #f4f4f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${request.requestedTime}</p>
            <p><strong>Game:</strong> ${request.game}</p>
          </div>
          
          <p>Please make sure you're online and ready at the scheduled time. If you need to cancel, please contact us as soon as possible.</p>
          
          <p>See you on the battlefield!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #6b7280; font-size: 14px;">
            © ${new Date().getFullYear()} Pelletion. All rights reserved.
          </p>
        </div>
      `,
    });
    
    console.log(`Confirmation email sent to ${request.email}`);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}

// Send rejection email
async function sendRejectionEmail(request: any): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("Skipping email: RESEND_API_KEY not configured");
    return;
  }

  const formattedDate = formatDate(request.requestedDate);
  
  try {
    await resend.emails.send({
      from: 'Pelletion Battle Request <onboarding@resend.dev>',
      to: [request.email],
      subject: `Battle Request - Unable to Accommodate`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6d28d9;">Battle Request Status Update</h1>
          
          <p>Hi ${request.name},</p>
          
          <p>Thank you for your interest in battling with Pelletion.</p>
          
          <p>Unfortunately, I won't be able to accommodate your request for <strong>${formattedDate}</strong> at <strong>${request.requestedTime}</strong>.</p>
          
          <p>Please feel free to submit another request for a different date and time. I look forward to the opportunity to battle with you soon!</p>
          
          <a href="https://pelletion.vercel.app" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #6d28d9; color: white; text-decoration: none; border-radius: 5px;">Submit New Request</a>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #6b7280; font-size: 14px;">
            © ${new Date().getFullYear()} Pelletion. All rights reserved.
          </p>
        </div>
      `,
    });
    
    console.log(`Rejection email sent to ${request.email}`);
  } catch (error) {
    console.error('Error sending rejection email:', error);
  }
}

export default async function handler(req: Request, res: Response) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  try {
    console.log("Battle request confirmation handler called with URL:", req.url);
    console.log("Request query parameters:", JSON.stringify(req.query));
    
    // Extract token and action from the URL
    let token = '';
    let action = '';
    
    // First, check standard query parameters
    if (req.query.token && req.query.action) {
      token = String(req.query.token);
      action = String(req.query.action);
    } 
    // If not found in query, try parsing from the URL path
    else if (req.url) {
      // Extract token from URL path format like /api/battle-requests-confirm?token=XXX&action=confirm
      const tokenMatch = req.url.match(/token=([^&]+)/);
      if (tokenMatch && tokenMatch[1]) {
        token = tokenMatch[1];
      }
      
      // Extract action from URL
      const actionMatch = req.url.match(/action=([^&]+)/);
      if (actionMatch && actionMatch[1]) {
        action = actionMatch[1];
      }
    }
    
    console.log("Extracted token:", token);
    console.log("Extracted action:", action);
    
    if (!token) {
      return res.status(400).json({ error: "Missing token parameter" });
    }
    
    if (!action || (action !== 'accept' && action !== 'confirm' && action !== 'reject')) {
      return res.status(400).json({ error: "Invalid action parameter. Must be 'accept', 'confirm', or 'reject'" });
    }
    
    // Normalize the action (handle both 'accept' and 'confirm')
    if (action === 'accept') {
      action = 'confirm';
    }
    
    console.log(`Processing battle request action: ${action} for token: ${token}`);
    
    try {
      // Retrieve the battle request
      const battleRequest = await getBattleRequestByToken(token);
      
      if (!battleRequest) {
        console.log(`Battle request with token ${token} not found`);
        return res.status(404).json({ error: "Battle request not found" });
      }
      
      // Update the status based on the action
      const newStatus = action === 'confirm' ? 'confirmed' : 'rejected';
      console.log(`Updating battle request status to: ${newStatus}`);
      
      const updatedRequest = await updateBattleRequestStatus(token, newStatus);
      
      if (!updatedRequest) {
        console.error(`Failed to update battle request with token ${token}`);
        return res.status(500).json({ error: "Failed to update battle request" });
      }
      
      console.log(`Battle request status updated to ${newStatus} for ID: ${updatedRequest.id}`);
      
      // Send appropriate email asynchronously
      try {
        if (action === 'confirm') {
          console.log(`Sending confirmation email to ${updatedRequest.email}`);
          sendConfirmationEmail(updatedRequest).catch(err => {
            console.error("Async confirmation email error:", err);
          });
        } else {
          console.log(`Sending rejection email to ${updatedRequest.email}`);
          sendRejectionEmail(updatedRequest).catch(err => {
            console.error("Async rejection email error:", err);
          });
        }
      } catch (emailError) {
        console.error("Failed to initiate email sending:", emailError);
        // Continue anyway - we already updated the status
      }
      
      // Get safely formatted values with fallbacks
      const name = updatedRequest.name || 'User';
      const twitchUsername = updatedRequest.twitchUsername || 'N/A';
      const game = updatedRequest.game || 'Not specified';
      const notes = updatedRequest.notes || '';
      const email = updatedRequest.email || 'user@example.com';
      
      // Format the date safely
      let formattedDate = 'Unknown Date';
      try {
        formattedDate = new Date(updatedRequest.requestedDate).toLocaleDateString();
      } catch (dateError) {
        console.error("Error formatting date:", dateError);
      }
      
      // Redirect to a success page or return a success message
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Battle Request ${action === 'confirm' ? 'Confirmed' : 'Rejected'}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              padding: 2rem;
              max-width: 600px;
              margin: 0 auto;
              line-height: 1.5;
              background-color: #121212;
              color: #ffffff;
            }
            h1 {
              color: ${action === 'confirm' ? '#22c55e' : '#ef4444'};
            }
            .card {
              background-color: #1e1e1e;
              border-radius: 8px;
              padding: 1.5rem;
              margin-bottom: 1rem;
              border: 1px solid #333;
            }
            .button {
              display: inline-block;
              margin-top: 1rem;
              background-color: #7c3aed;
              color: white;
              padding: 0.5rem 1rem;
              border-radius: 5px;
              text-decoration: none;
            }
            .details {
              margin-top: 1rem;
            }
            .details p {
              margin: 0.5rem 0;
            }
            .label {
              color: #a1a1aa;
              font-size: 0.875rem;
            }
          </style>
        </head>
        <body>
          <h1>Battle Request ${action === 'confirm' ? 'Confirmed' : 'Rejected'}</h1>
          <div class="card">
            <p>You have successfully ${action === 'confirm' ? 'confirmed' : 'rejected'} the battle request from ${name}.</p>
            
            <div class="details">
              <p class="label">Date:</p>
              <p>${formattedDate}</p>
              
              <p class="label">Time:</p>
              <p>${updatedRequest.requestedTime || 'Not specified'}</p>
              
              <p class="label">Challenger:</p>
              <p>${name} (${twitchUsername})</p>
              
              <p class="label">Game:</p>
              <p>${game}</p>
              
              ${notes ? `
              <p class="label">Notes:</p>
              <p>${notes}</p>
              ` : ''}
            </div>
            
            <p>An email notification has been sent to ${name} to inform them of your decision.</p>
          </div>
          
          <a href="https://pelletion.vercel.app" class="button">Return to Website</a>
        </body>
        </html>
      `);
    } catch (innerError) {
      console.error("Error processing battle request:", innerError);
      
      // Return a simple error page instead of JSON
      return res.status(500).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error Processing Request</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              padding: 2rem;
              max-width: 600px;
              margin: 0 auto;
              line-height: 1.5;
              background-color: #121212;
              color: #ffffff;
            }
            h1 {
              color: #ef4444;
            }
            .card {
              background-color: #1e1e1e;
              border-radius: 8px;
              padding: 1.5rem;
              margin-bottom: 1rem;
              border: 1px solid #333;
            }
            .button {
              display: inline-block;
              margin-top: 1rem;
              background-color: #7c3aed;
              color: white;
              padding: 0.5rem 1rem;
              border-radius: 5px;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <h1>Error Processing Request</h1>
          <div class="card">
            <p>Sorry, there was an error processing the battle request. Please try again later.</p>
            <p>The system administrator has been notified of this issue.</p>
          </div>
          
          <a href="https://pelletion.vercel.app" class="button">Return to Website</a>
        </body>
        </html>
      `);
    }
  } catch (outerError) {
    console.error("Unhandled exception in battle-requests-confirm:", outerError);
    
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 2rem;
            max-width: 600px;
            margin: 0 auto;
            line-height: 1.5;
            background-color: #121212;
            color: #ffffff;
          }
          h1 {
            color: #ef4444;
          }
          .card {
            background-color: #1e1e1e;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            border: 1px solid #333;
          }
          .button {
            display: inline-block;
            margin-top: 1rem;
            background-color: #7c3aed;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 5px;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <h1>Server Error</h1>
        <div class="card">
          <p>Sorry, a server error occurred. Please try again later.</p>
        </div>
        
        <a href="https://pelletion.vercel.app" class="button">Return to Website</a>
      </body>
      </html>
    `);
  } finally {
    // Always ensure we release the database connection
    // pool.end(); // Don't end the pool in serverless functions
  }
}