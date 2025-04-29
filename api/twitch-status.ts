import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  const { channelName } = req.query;
  
  if (!channelName || typeof channelName !== 'string') {
    return res.status(400).json({ error: "Channel name parameter is required" });
  }
  
  // Check if Twitch client credentials are available
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    return res.status(500).json({ error: "Twitch credentials not configured" });
  }
  
  try {
    // Get access token from Twitch
    const tokenResponse = await fetch(
      'https://id.twitch.tv/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          grant_type: 'client_credentials',
        }),
      }
    );
    
    if (!tokenResponse.ok) {
      console.error('Failed to get Twitch access token');
      return res.status(500).json({ error: "Failed to get Twitch access token" });
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    // Check if the channel is live
    const streamResponse = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${channelName}`,
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!streamResponse.ok) {
      console.error('Failed to get Twitch stream status');
      return res.status(500).json({ error: "Failed to get Twitch stream status" });
    }
    
    const streamData = await streamResponse.json();
    
    // If data array has items, the channel is live
    const isLive = streamData.data && streamData.data.length > 0;
    const liveData = isLive ? streamData.data[0] : null;
    
    return res.json({
      isLive,
      data: liveData,
    });
  } catch (error) {
    console.error("Error checking Twitch stream status:", error);
    return res.status(500).json({ error: "Failed to check Twitch stream status" });
  }
}