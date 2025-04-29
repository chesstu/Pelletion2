import { storage } from '../server/storage';
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  // Make sure it's a GET request
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dateStr = req.query.date as string;
    
    if (!dateStr) {
      return res.status(400).json({ error: "Date parameter is required" });
    }
    
    const date = new Date(dateStr);
    
    // Get all battle requests for validation
    const allRequests = await storage.getBattleRequests();
    
    // Define time slots from 2 PM to midnight
    const allTimeSlots = [
      "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", 
      "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM"
    ];
    
    // Format the requested date for comparison
    const formattedDate = date.toISOString().split('T')[0];
    
    // Check which slots are already taken
    const result = allTimeSlots.map(time => {
      // Check if this slot is already taken or pending for the requested date
      const isTaken = allRequests.some(request => {
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
    
    return res.json(result);
  } catch (error) {
    console.error("Error checking time slot availability:", error);
    return res.status(500).json({ error: "Failed to check time slot availability" });
  }
}