import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  // Check if Twitch client credentials are available
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    return res.status(500).json({ error: "Twitch credentials not configured" });
  }
  
  try {
    // Return the client ID (but not the secret)
    return res.json({
      clientId: process.env.TWITCH_CLIENT_ID
    });
  } catch (error) {
    console.error("Error getting Twitch client token:", error);
    return res.status(500).json({ error: "Failed to get Twitch client token" });
  }
}