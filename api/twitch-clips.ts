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
    
    // Get user ID from username
    const userResponse = await fetch(
      `https://api.twitch.tv/helix/users?login=${channelName}`,
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!userResponse.ok) {
      console.error('Failed to get Twitch user');
      return res.status(500).json({ error: "Failed to get Twitch user" });
    }
    
    const userData = await userResponse.json();
    
    if (!userData.data || userData.data.length === 0) {
      return res.status(404).json({ error: "Twitch channel not found" });
    }
    
    const userId = userData.data[0].id;
    
    // Get clips for the user
    const clipsResponse = await fetch(
      `https://api.twitch.tv/helix/clips?broadcaster_id=${userId}&first=6`,
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!clipsResponse.ok) {
      console.error('Failed to get Twitch clips');
      return res.status(500).json({ error: "Failed to get Twitch clips" });
    }
    
    const clipsData = await clipsResponse.json();
    
    // Format clips data for the frontend
    const formattedClips = clipsData.data.map((clip: any) => ({
      id: clip.id,
      title: clip.title,
      url: clip.url,
      thumbnail_url: clip.thumbnail_url,
      view_count: clip.view_count,
      duration: clip.duration,
      created_at: clip.created_at,
      published_at: clip.created_at, // Using created_at for published_at
    }));
    
    return res.json(formattedClips);
  } catch (error) {
    console.error("Error fetching Twitch clips:", error);
    return res.status(500).json({ error: "Failed to fetch Twitch clips" });
  }
}