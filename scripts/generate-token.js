import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTwitchToken() {
  try {
    console.log('Generating Twitch access token...');
    
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('Error: TWITCH_CLIENT_ID and/or TWITCH_CLIENT_SECRET environment variables are not set.');
      process.exit(1);
    }
    
    // Get Twitch OAuth token
    const response = await axios.post(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`
    );
    
    const accessToken = response.data.access_token;
    if (!accessToken) {
      console.error('Error: Failed to get access token from Twitch API.');
      process.exit(1);
    }
    
    // Update .env file with new token
    const envFilePath = path.join(__dirname, '../client/.env');
    let envContent = '';
    
    try {
      envContent = fs.readFileSync(envFilePath, 'utf8');
    } catch (err) {
      envContent = `VITE_TWITCH_CLIENT_ID=${clientId}\n`;
    }
    
    // Replace token line or add it if it doesn't exist
    if (envContent.includes('VITE_TWITCH_ACCESS_TOKEN=')) {
      envContent = envContent.replace(
        /VITE_TWITCH_ACCESS_TOKEN=.*/,
        `VITE_TWITCH_ACCESS_TOKEN=${accessToken}`
      );
    } else {
      envContent += `VITE_TWITCH_ACCESS_TOKEN=${accessToken}\n`;
    }
    
    fs.writeFileSync(envFilePath, envContent);
    
    console.log('Token generated successfully and saved to client/.env');
    console.log('Token will expire in approximately 60 days.');
    console.log('Run this script again if you encounter authentication issues with Twitch API.');
    
  } catch (error) {
    console.error('Error generating token:', error.message);
    if (error.response) {
      console.error('API Error details:', error.response.data);
    }
    process.exit(1);
  }
}

generateTwitchToken();