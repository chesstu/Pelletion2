import { storage } from '../server/storage';
import type { Request, Response } from 'express';

// Define time slots from 2 PM to midnight
const DEFAULT_TIME_SLOTS = [
  "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", 
  "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM"
];

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
      const allRequests = await storage.getBattleRequests();
      console.log(`Found ${allRequests.length} battle requests to check against`);
      
      // Format the requested date for comparison
      const formattedDate = date.toISOString().split('T')[0];
      
      // Check which slots are already taken
      const result = DEFAULT_TIME_SLOTS.map(time => {
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
  }
}