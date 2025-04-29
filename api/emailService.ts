import { Resend } from 'resend';
import type { BattleRequest } from '../shared/schema';

// Initialize Resend with the API key
const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'default@example.com';

// Format date for email display
function formatDate(date: Date | string): string {
  let dateObj: Date;
  try {
    if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return String(date);
  }
}

// Send email notification to admin for a new battle request
export async function sendBattleRequestEmail(request: BattleRequest): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("Skipping email: RESEND_API_KEY not configured");
    return;
  }

  const formattedDate = formatDate(request.requestedDate);
  const confirmUrl = `https://pelletion.vercel.app/api/battle-requests-confirm?token=${request.token}&action=confirm`;
  const rejectUrl = `https://pelletion.vercel.app/api/battle-requests-confirm?token=${request.token}&action=reject`;

  try {
    await resend.emails.send({
      from: 'Pelletion Battle Request <onboarding@resend.dev>',
      to: [ADMIN_EMAIL],
      subject: `New Battle Request: ${request.name} - ${formattedDate}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6d28d9;">New Battle Request</h1>
          
          <div style="background-color: #f4f4f5; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <p><strong>From:</strong> ${request.name}</p>
            <p><strong>Email:</strong> ${request.email}</p>
            <p><strong>Twitch Username:</strong> ${request.twitchUsername}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${request.requestedTime}</p>
            <p><strong>Game:</strong> ${request.game}</p>
            ${request.notes ? `<p><strong>Notes:</strong> ${request.notes}</p>` : ''}
          </div>
          
          <div style="margin-bottom: 20px;">
            <p>Would you like to accept or decline this battle request?</p>
            
            <div style="display: flex; gap: 10px;">
              <a href="${confirmUrl}" style="display: inline-block; padding: 10px 20px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px;">Accept</a>
              <a href="${rejectUrl}" style="display: inline-block; padding: 10px 20px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px;">Decline</a>
            </div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            © ${new Date().getFullYear()} Pelletion. All rights reserved.
          </p>
        </div>
      `,
    });
    
    console.log(`Battle request email sent to admin for ${request.name}'s request`);
  } catch (error) {
    console.error('Error sending battle request email:', error);
    throw error;
  }
}

// Send confirmation email to the user
export async function sendConfirmationEmail(request: BattleRequest): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("Skipping email: RESEND_API_KEY not configured");
    return;
  }

  const formattedDate = formatDate(request.requestedDate);
  
  try {
    await resend.emails.send({
      from: 'Pelletion Battle Confirmation <onboarding@resend.dev>',
      to: [request.email],
      subject: `Battle Request Confirmed - ${formattedDate} at ${request.requestedTime}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Battle Request Confirmed!</h1>
          
          <p>Hi ${request.name},</p>
          
          <p>Great news! Your battle request has been <strong>confirmed</strong>.</p>
          
          <div style="background-color: #f4f4f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${request.requestedTime}</p>
            <p><strong>Game:</strong> ${request.game}</p>
          </div>
          
          <p>Please make sure you're online and ready at the scheduled time. If you need to cancel, please contact us as soon as possible.</p>
          
          <p>See you on the battlefield!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #6b7280; font-size: 14px;">
            © ${new Date().getFullYear()} Pelletion. All rights reserved.
          </p>
        </div>
      `,
    });
    
    console.log(`Confirmation email sent to ${request.email}`);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
}

// Send rejection email to the user
export async function sendRejectionEmail(request: BattleRequest): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("Skipping email: RESEND_API_KEY not configured");
    return;
  }

  const formattedDate = formatDate(request.requestedDate);
  
  try {
    await resend.emails.send({
      from: 'Pelletion Battle Request <onboarding@resend.dev>',
      to: [request.email],
      subject: `Battle Request - Unable to Accommodate`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6d28d9;">Battle Request Status Update</h1>
          
          <p>Hi ${request.name},</p>
          
          <p>Thank you for your interest in battling with Pelletion.</p>
          
          <p>Unfortunately, I won't be able to accommodate your request for <strong>${formattedDate}</strong> at <strong>${request.requestedTime}</strong>.</p>
          
          <p>Please feel free to submit another request for a different date and time. I look forward to the opportunity to battle with you soon!</p>
          
          <a href="https://pelletion.vercel.app" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #6d28d9; color: white; text-decoration: none; border-radius: 5px;">Submit New Request</a>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #6b7280; font-size: 14px;">
            © ${new Date().getFullYear()} Pelletion. All rights reserved.
          </p>
        </div>
      `,
    });
    
    console.log(`Rejection email sent to ${request.email}`);
  } catch (error) {
    console.error('Error sending rejection email:', error);
    throw error;
  }
}