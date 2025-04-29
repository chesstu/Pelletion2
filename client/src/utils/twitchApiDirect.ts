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
    const response = await fetch('/api/twitch/client-token');
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

// Direct Twitch API calls using client credentials
export async function getTwitchLiveStatus(channelName: string) {
  try {
    const creds = await getCredentials();
    
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${channelName}`, {
      headers: {
        'Client-ID': creds.clientId as string,
        'Authorization': `Bearer ${creds.accessToken as string}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch Twitch status');
    }
    
    const data = await response.json();
    return data.data?.[0] || null;
  } catch (error) {
    console.error('Error fetching Twitch status:', error);
    return null;
  }
}

export async function getTwitchClips(channelName: string) {
  try {
    const creds = await getCredentials();
    
    // First get user ID
    const userResponse = await fetch(`https://api.twitch.tv/helix/users?login=${channelName}`, {
      headers: {
        'Client-ID': creds.clientId as string,
        'Authorization': `Bearer ${creds.accessToken as string}`
      }
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to fetch Twitch user');
    }
    
    const userData = await userResponse.json();
    if (!userData.data || userData.data.length === 0) {
      return [];
    }
    
    const userId = userData.data[0].id;
    
    // Then get clips
    const clipsResponse = await fetch(`https://api.twitch.tv/helix/clips?broadcaster_id=${userId}&first=6`, {
      headers: {
        'Client-ID': creds.clientId as string,
        'Authorization': `Bearer ${creds.accessToken as string}`
      }
    });
    
    if (!clipsResponse.ok) {
      throw new Error('Failed to fetch Twitch clips');
    }
    
    const clipsData = await clipsResponse.json();
    
    // Transform clips to match TwitchVideoInfo format
    const transformedClips: TwitchVideoInfo[] = clipsData.data.map((clip: any) => ({
      id: clip.id,
      title: clip.title,
      url: clip.url,
      thumbnail_url: clip.thumbnail_url,
      view_count: clip.view_count,
      duration: "00:30", // Clips are typically short
      created_at: clip.created_at,
      published_at: clip.created_at
    }));
    
    return transformedClips;
  } catch (error) {
    console.error('Error fetching Twitch clips:', error);
    return [];
  }
}