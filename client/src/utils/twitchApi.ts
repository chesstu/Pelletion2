import { apiRequest } from "@/lib/queryClient";

// Singleton for storing and refreshing access token
let twitchAccessToken: string | null = null;
let tokenExpiryTime: number | null = null;

/**
 * Fetches a new Twitch API access token
 */
export async function getAccessToken(): Promise<string> {
  // If we have a valid token, use it
  const now = Date.now();
  if (twitchAccessToken && tokenExpiryTime && now < tokenExpiryTime) {
    return twitchAccessToken;
  }

  try {
    const response = await apiRequest('GET', '/api/twitch/auth', undefined);
    const data = await response.json();
    
    // Store the token and set expiry (with a buffer)
    twitchAccessToken = data.accessToken;
    // Expires in value is in seconds, convert to milliseconds and subtract 5 minutes as a buffer
    tokenExpiryTime = now + (data.expiresIn * 1000) - (5 * 60 * 1000);
    
    return twitchAccessToken;
  } catch (error) {
    console.error('Failed to get Twitch access token:', error);
    throw new Error('Failed to authenticate with Twitch');
  }
}

/**
 * Checks if a Twitch channel is currently live
 */
export async function checkChannelLiveStatus(channelName: string): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const response = await apiRequest('GET', `/api/twitch/channel/live?channel=${channelName}`, undefined);
    const data = await response.json();
    return data.isLive;
  } catch (error) {
    console.error('Failed to check channel live status:', error);
    return false;
  }
}

/**
 * Gets a list of videos/highlights for a channel
 */
export async function getChannelVideos(channelName: string, limit = 6): Promise<any[]> {
  try {
    const token = await getAccessToken();
    const response = await apiRequest('GET', `/api/twitch/channel/videos?channel=${channelName}&limit=${limit}`, undefined);
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Failed to get channel videos:', error);
    return [];
  }
}
