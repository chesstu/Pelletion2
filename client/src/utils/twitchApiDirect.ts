import { TwitchVideoInfo } from '@shared/schema';

// Client credentials from server
let clientId: string | null = null;
let accessToken: string | null = null;

// Function to get Twitch API credentials from server
async function getCredentials() {
  if (clientId && accessToken) {
    return { clientId, accessToken };
  }
  
  try {
    const response = await fetch('/api/twitch-client-token');
    if (!response.ok) {
      throw new Error('Failed to fetch Twitch credentials');
    }
    
    const data = await response.json();
    clientId = data.clientId;
    accessToken = data.accessToken;
    
    return { clientId, accessToken };
  } catch (error) {
    console.error('Error fetching Twitch credentials:', error);
    throw error;
  }
}

// Use serverless functions to handle Twitch API calls
export async function getTwitchLiveStatus(channelName: string) {
  try {
    console.log('Checking Twitch stream status...');
    
    // Use our serverless function to get the status
    const response = await fetch(`/api/twitch-status?channelName=${channelName}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch stream status');
    }
    
    const data = await response.json();
    console.log('Twitch stream status:', data.isLive ? data.data : null);
    return data.isLive ? data.data : null;
  } catch (error) {
    console.error('Error checking Twitch stream status:', error);
    return null;
  }
}

export async function getTwitchClips(channelName: string) {
  try {
    // Use our serverless function to get clips
    const response = await fetch(`/api/twitch-clips?channelName=${channelName}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch Twitch clips');
    }
    
    const clips = await response.json();
    console.log('Twitch clips received:', clips);
    return clips;
  } catch (error) {
    console.error('Error fetching Twitch clips:', error);
    
    // Return empty array on error
    return [];
  }
}