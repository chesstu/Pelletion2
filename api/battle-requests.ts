import { storage } from '../server/storage';
import type { Request, Response } from 'express';
import { insertBattleRequestSchema, updateBattleRequestStatusSchema } from '../shared/schema';
import { randomBytes } from 'crypto';
import { sendBattleRequestEmail } from '../server/services/emailService';

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
        
        // Validate the request body
        const validatedData = insertBattleRequestSchema.parse(req.body);
        console.log("Parsed battle request data:", JSON.stringify(validatedData));
        
        // Generate a unique token for this request
        const token = randomBytes(32).toString('hex');
        
        // Add the token and set status to pending
        const requestData = {
          ...validatedData,
          token,
          status: 'pending',
        };
        
        // Create the battle request
        const createdRequest = await storage.createBattleRequest(requestData);
        console.log(`Battle request created with ID: ${createdRequest.id}`);
        
        // Send email notification
        try {
          console.log(`Sending battle request notification to admin for ${createdRequest.name}'s request`);
          await sendBattleRequestEmail(createdRequest);
          console.log("Battle request email sent successfully to admin");
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
          // Continue anyway - don't fail the request if email fails
        }
        
        return res.status(201).json(createdRequest);
      } catch (error) {
        console.error("Error creating battle request:", error);
        
        // Handle validation errors
        if (error.errors) {
          console.error("Validation errors:", JSON.stringify(error.errors));
          return res.status(400).json({
            error: "Invalid request data",
            details: error.errors,
          });
        }
        
        return res.status(500).json({ 
          error: "Failed to create battle request",
          message: error.message || "Unknown error" 
        });
      }
    }
    
    // PATCH request to update battle request status (used in API routes for Vercel)
    else if (req.method === 'PATCH') {
      try {
        const { token, status } = updateBattleRequestStatusSchema.parse(req.body);
        console.log(`Updating battle request status for token: ${token} to: ${status}`);
        
        // Update the battle request status
        const updatedRequest = await storage.updateBattleRequestStatus(token, status);
        
        if (!updatedRequest) {
          console.error(`Battle request with token ${token} not found`);
          return res.status(404).json({ error: "Battle request not found" });
        }
        
        console.log(`Battle request status updated to ${status} for ID: ${updatedRequest.id}`);
        return res.json(updatedRequest);
      } catch (error) {
        console.error("Error updating battle request:", error);
        
        // Handle validation errors
        if (error.errors) {
          console.error("Validation errors:", JSON.stringify(error.errors));
          return res.status(400).json({
            error: "Invalid request data",
            details: error.errors,
          });
        }
        
        return res.status(500).json({ 
          error: "Failed to update battle request",
          message: error.message || "Unknown error"
        });
      }
    }
    
    // POST method with update-status path to provide consistent API with the server
    else if (req.method === 'POST' && req.url?.includes('update-status')) {
      try {
        console.log("Received status update data:", JSON.stringify(req.body));
        const { token, status } = updateBattleRequestStatusSchema.parse(req.body);
        
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
        
        // Handle validation errors
        if (error.errors) {
          console.error("Validation errors:", JSON.stringify(error.errors));
          return res.status(400).json({
            error: "Invalid request data",
            details: error.errors,
          });
        }
        
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