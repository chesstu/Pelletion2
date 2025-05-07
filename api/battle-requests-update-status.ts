
import type { Request, Response } from 'express';
import { storage } from '../server/storage';
import { updateBattleRequestStatusSchema } from '../shared/schema';
import { ZodError } from 'zod';
import { sendConfirmationEmail, sendRejectionEmail } from '../server/services/emailService';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { status, token } = updateBattleRequestStatusSchema.parse(req.body);
    const request = await storage.updateBattleRequestStatus(token, status);
    
    if (!request) {
      return res.status(404).json({ error: "Battle request not found" });
    }
    
    // Return success response immediately
    res.json(request);
    
    // Send confirmation or rejection email
    if (status === 'confirmed') {
      sendConfirmationEmail(request).catch(err => {
        console.error("Failed to send confirmation email:", err);
      });
    } else if (status === 'rejected') {
      sendRejectionEmail(request).catch(err => {
        console.error("Failed to send rejection email:", err);
      });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error updating battle request status:", error);
    return res.status(500).json({ error: "Failed to update battle request status" });
  }
}
