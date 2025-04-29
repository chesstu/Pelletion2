import { storage } from '../server/storage';
import type { Request, Response } from 'express';
import { sendConfirmationEmail, sendRejectionEmail } from '../server/services/emailService';

export default async function handler(req: Request, res: Response) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  try {
    const { token, action } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: "Missing token parameter" });
    }
    
    if (!action || (action !== 'confirm' && action !== 'reject')) {
      return res.status(400).json({ error: "Invalid action parameter. Must be 'confirm' or 'reject'" });
    }
    
    console.log(`Processing battle request action: ${action} for token: ${token}`);
    
    try {
      // Retrieve the battle request
      const battleRequest = await storage.getBattleRequestByToken(token);
      
      if (!battleRequest) {
        console.log(`Battle request with token ${token} not found`);
        return res.status(404).json({ error: "Battle request not found" });
      }
      
      // Update the status based on the action
      const newStatus = action === 'confirm' ? 'confirmed' : 'rejected';
      console.log(`Updating battle request status to: ${newStatus}`);
      
      const updatedRequest = await storage.updateBattleRequestStatus(token, newStatus);
      
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
  }
}