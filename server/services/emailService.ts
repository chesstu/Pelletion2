import { Resend } from 'resend';
import { BattleRequest } from '@shared/schema';
import { format } from 'date-fns';

// Create Resend client with better error handling
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.warn('RESEND_API_KEY is not set. Email functionality will not work properly.');
}

// Create the Resend client only if API key is available
let resend: Resend | null = null;
try {
  if (resendApiKey) {
    resend = new Resend(resendApiKey);
  }
} catch (error) {
  console.error('Error initializing Resend client:', error);
}

// Format date from Date object
function formatDate(date: Date | string): string {
  try {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return format(date, 'MMMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    // Return a generic fallback for dates that can't be parsed
    return 'scheduled date';
  }
}

// Send email to admin when a new battle request is created
export async function sendBattleRequestEmail(request: BattleRequest): Promise<void> {
  try {
    if (!resend) {
      console.warn('Resend client not initialized. Email will not be sent.');
      return;
    }
  
    const { name, email, twitchUsername, game, requestedDate, requestedTime, notes, token } = request;
    
    const formattedDate = formatDate(requestedDate);
    
    // Allow different base URLs based on environment
    // First check for VERCEL_URL (Vercel deployments)
    // Then fall back to REPLIT_DOMAINS (Replit deployments)
    // Finally use localhost for local development
    const vercelUrl = process.env.VERCEL_URL;
    const replitDomain = process.env.REPLIT_DOMAINS;
    let baseUrl = 'http://localhost:5000';
    
    if (vercelUrl) {
      baseUrl = `https://${vercelUrl}`;
    } else if (replitDomain) {
      baseUrl = `https://${replitDomain}`;
    }
    
    console.log(`Using base URL for email links: ${baseUrl}`);
    
    const acceptUrl = `${baseUrl}/admin?token=${token}&action=accept`;
    const rejectUrl = `${baseUrl}/admin?token=${token}&action=reject`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0E0E10; color: #EFEFF1; border-radius: 8px;">
        <div style="background-color: #9146FF; padding: 15px; border-radius: 4px 4px 0 0; text-align: center;">
          <h2 style="margin: 0; color: white;">New Battle Request</h2>
        </div>
        
        <div style="padding: 20px; background-color: #18181B; border-radius: 0 0 4px 4px;">
          <p>You have received a new battle request from <strong>${name}</strong>.</p>
          
          <div style="background-color: #0E0E10; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h3 style="margin-top: 0; color: #9146FF;">Battle Details</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Twitch Username:</strong> ${twitchUsername || 'Not provided'}</p>
            <p><strong>Game:</strong> ${game}</p>
            <p><strong>Requested Date:</strong> ${formattedDate}</p>
            <p><strong>Requested Time:</strong> ${requestedTime}</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${acceptUrl}" style="display: inline-block; background-color: #00FF7F; color: #0E0E10; padding: 10px 20px; margin-right: 10px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Request</a>
            <a href="${rejectUrl}" style="display: inline-block; background-color: #FF4D4D; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Decline Request</a>
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #808080;">This email was sent automatically from your Twitch Battle Request system.</p>
        </div>
      </div>
    `;
    
    // Get the admin email from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    
    if (!adminEmail) {
      console.error('ADMIN_EMAIL environment variable is not set. Notification email will not be sent.');
      return; // Exit early if no admin email is set
    }
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'Twitch Battle Requests <onboarding@resend.dev>',
        to: [adminEmail],
        subject: `New Battle Request from ${name}`,
        html: html
      });
      
      if (error) {
        console.error('Error response from Resend API:', error);
        return; // Don't throw, just log and continue
      }
      
      console.log(`Battle request notification sent to admin for ${name}'s request`, data);
    } catch (sendError) {
      console.error('Exception sending battle request email:', sendError);
      // Don't rethrow, let the function complete
    }
  } catch (error) {
    console.error('Unexpected error in sendBattleRequestEmail:', error);
    // Don't rethrow, let the function complete
  }
}

// Send confirmation email to user when their request is accepted
export async function sendConfirmationEmail(request: BattleRequest): Promise<void> {
  try {
    if (!resend) {
      console.warn('Resend client not initialized. Email will not be sent.');
      return;
    }
  
    const { name, email, twitchUsername, game, requestedDate, requestedTime } = request;
    
    const formattedDate = formatDate(requestedDate);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0E0E10; color: #EFEFF1; border-radius: 8px;">
        <div style="background-color: #9146FF; padding: 15px; border-radius: 4px 4px 0 0; text-align: center;">
          <h2 style="margin: 0; color: white;">Battle Request Confirmed!</h2>
        </div>
        
        <div style="padding: 20px; background-color: #18181B; border-radius: 0 0 4px 4px;">
          <p>Hello ${name},</p>
          <p>Great news! Your battle request has been <strong style="color: #00FF7F;">confirmed</strong>. Get ready to play!</p>
          
          <div style="background-color: #0E0E10; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <h3 style="margin-top: 0; color: #9146FF;">Battle Details</h3>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${requestedTime}</p>
            <p><strong>Game:</strong> ${game}</p>
            <p><strong>Twitch Channel:</strong> <a href="https://www.twitch.tv/pelletion" style="color: #9146FF;">twitch.tv/pelletion</a></p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #0E0E10; border-radius: 4px; border-left: 4px solid #00FF7F;">
            <p style="margin: 0;"><strong>Important:</strong> Please be online at least 5 minutes before the scheduled time. Make sure to follow the channel so you'll know when the stream starts!</p>
          </div>
          
          <p style="margin-top: 20px;">If you have any questions or need to reschedule, please reply to this email.</p>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://www.twitch.tv/pelletion" style="display: inline-block; background-color: #9146FF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Visit Twitch Channel</a>
          </div>
          
          <p style="margin-top: 30px;">See you soon!</p>
          <p style="margin-bottom: 0;">- Pelletion</p>
        </div>
      </div>
    `;
    
    // In test mode, we need to send to Resend's test email
    const testMode = process.env.NODE_ENV !== 'production';
    const emailRecipient = testMode ? 'delivered@resend.dev' : email;
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'Pelletion - Twitch <onboarding@resend.dev>',
        to: [emailRecipient],
        subject: 'Your Battle Request has been Confirmed!',
        html: html
      });
      
      if (error) {
        console.error('Error response from Resend API:', error);
        return; // Don't throw, just log and continue
      }
      
      console.log(`Confirmation email sent to ${email}`, data);
    } catch (sendError) {
      console.error('Exception sending confirmation email:', sendError);
      // Don't rethrow, let the function complete
    }
  } catch (error) {
    console.error('Unexpected error in sendConfirmationEmail:', error);
    // Don't rethrow, let the function complete
  }
}

// Send rejection email to user when their request is rejected
export async function sendRejectionEmail(request: BattleRequest): Promise<void> {
  try {
    if (!resend) {
      console.warn('Resend client not initialized. Email will not be sent.');
      return;
    }
  
    const { name, email, requestedDate, requestedTime } = request;
    
    const formattedDate = formatDate(requestedDate);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0E0E10; color: #EFEFF1; border-radius: 8px;">
        <div style="background-color: #9146FF; padding: 15px; border-radius: 4px 4px 0 0; text-align: center;">
          <h2 style="margin: 0; color: white;">Battle Request Update</h2>
        </div>
        
        <div style="padding: 20px; background-color: #18181B; border-radius: 0 0 4px 4px;">
          <p>Hello ${name},</p>
          <p>Thank you for your interest in battling with me. Unfortunately, I'm unable to accept your request for <strong>${formattedDate}</strong> at <strong>${requestedTime}</strong>.</p>
          
          <p>This could be due to scheduling conflicts or other commitments that have come up.</p>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #0E0E10; border-radius: 4px;">
            <p style="margin: 0;">Feel free to submit a new request for a different date and time. I'd love to play with you when our schedules align!</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://www.twitch.tv/pelletion" style="display: inline-block; background-color: #9146FF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Follow on Twitch</a>
          </div>
          
          <p style="margin-top: 30px;">Thanks for your understanding!</p>
          <p style="margin-bottom: 0;">- Pelletion</p>
        </div>
      </div>
    `;
    
    // In test mode, we need to send to Resend's test email
    const testMode = process.env.NODE_ENV !== 'production';
    const emailRecipient = testMode ? 'delivered@resend.dev' : email;
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'Pelletion - Twitch <onboarding@resend.dev>',
        to: [emailRecipient],
        subject: 'About Your Battle Request',
        html: html
      });
      
      if (error) {
        console.error('Error response from Resend API:', error);
        return; // Don't throw, just log and continue
      }
      
      console.log(`Rejection email sent to ${email}`, data);
    } catch (sendError) {
      console.error('Exception sending rejection email:', sendError);
      // Don't rethrow, let the function complete
    }
  } catch (error) {
    console.error('Unexpected error in sendRejectionEmail:', error);
    // Don't rethrow, let the function complete
  }
}
