import { storage } from '../server/storage';
import type { Request, Response } from 'express';
import { insertBattleRequestSchema, updateBattleRequestStatusSchema } from '../shared/schema';
import { randomBytes } from 'crypto';
import { sendBattleRequestEmail } from '../server/services/emailService';

export default async function handler(req: Request, res: Response) {
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
      // Validate the request body
      const validatedData = insertBattleRequestSchema.parse(req.body);
      
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
      
      // Send email notification
      try {
        await sendBattleRequestEmail(createdRequest);
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Continue anyway - don't fail the request if email fails
      }
      
      return res.status(201).json(createdRequest);
    } catch (error) {
      console.error("Error creating battle request:", error);
      
      // Handle validation errors
      if (error.errors) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors,
        });
      }
      
      return res.status(500).json({ error: "Failed to create battle request" });
    }
  }
  
  // PATCH request to update battle request status
  else if (req.method === 'PATCH') {
    try {
      const { token, status } = updateBattleRequestStatusSchema.parse(req.body);
      
      // Update the battle request status
      const updatedRequest = await storage.updateBattleRequestStatus(token, status);
      
      if (!updatedRequest) {
        return res.status(404).json({ error: "Battle request not found" });
      }
      
      return res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating battle request:", error);
      
      // Handle validation errors
      if (error.errors) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors,
        });
      }
      
      return res.status(500).json({ error: "Failed to update battle request" });
    }
  }
  
  // Method not allowed
  else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}