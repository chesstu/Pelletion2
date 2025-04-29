import { storage } from './storage';
import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { sendBattleRequestEmail } from './emailService';

export default async function handler(req: Request, res: Response) {
  try {
    // GET request to fetch all battle requests
    if (req.method === 'GET') {
      try {
        const battleRequests = await storage.getBattleRequests();
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
        const createdRequest = await storage.createBattleRequest(requestData);
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
        const updatedRequest = await storage.updateBattleRequestStatus(token, status);
        
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
  }
}