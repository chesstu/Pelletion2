import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBattleRequestSchema, updateBattleRequestStatusSchema, insertUserSchema } from "@shared/schema";
import { ZodError } from "zod";
import { sendBattleRequestEmail, sendConfirmationEmail, sendRejectionEmail } from "./services/emailService";
import axios from "axios";
import passport from "passport";
import { promisify } from "util";
import { scrypt, randomBytes } from "crypto";

// Twitch API constants
const TWITCH_API_BASE = "https://api.twitch.tv/helix";
const TWITCH_CHANNEL_NAME = "pelletion";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post('/api/register', async (req, res) => {
    try {
      // Check if we're in development or ADMIN_EMAIL matches
      const isAllowed = process.env.NODE_ENV === 'development' || 
                        (process.env.ADMIN_EMAIL && req.body.username === process.env.ADMIN_EMAIL);
      
      if (!isAllowed) {
        return res.status(403).json({ error: "Registration not allowed" });
      }
      
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Hash password
      const scryptAsync = promisify(scrypt);
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(userData.password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      // Create user with hashed password
      const user = await storage.createUser({
        username: userData.username,
        password: hashedPassword
      });
      
      // Log user in
      req.login(user, (err) => {
        if (err) {
          console.error("Login error after registration:", err);
          return res.status(500).json({ error: "Failed to log in after registration" });
        }
        
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });
  
  app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Authentication error" });
      }
      
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ error: "Failed to establish session" });
        }
        
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });
  
  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Failed to log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  app.get('/api/user', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });
  
  // Protected endpoints that require authentication
  app.get('/api/admin/battle-requests', isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getBattleRequests();
      return res.json(requests);
    } catch (error) {
      console.error("Error fetching battle requests for admin:", error);
      return res.status(500).json({ error: "Failed to fetch battle requests" });
    }
  });
  
  // Get Twitch access token
  app.get('/api/twitch/auth', async (req, res) => {
    try {
      const clientId = process.env.TWITCH_CLIENT_ID;
      const clientSecret = process.env.TWITCH_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.status(500).json({ error: "Twitch API credentials not configured" });
      }
      
      const result = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`);
      
      return res.json({
        accessToken: result.data.access_token,
        expiresIn: result.data.expires_in
      });
    } catch (error) {
      console.error("Error getting Twitch auth token:", error);
      return res.status(500).json({ error: "Failed to authenticate with Twitch" });
    }
  });
  
  // Get Twitch token for client-side use
  app.get('/api/twitch/client-token', async (req, res) => {
    try {
      const clientId = process.env.TWITCH_CLIENT_ID;
      const clientSecret = process.env.TWITCH_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.status(500).json({ error: "Twitch API credentials not configured" });
      }
      
      const result = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`);
      
      // Return both token and client ID for use on the frontend
      return res.json({
        clientId: clientId,
        accessToken: result.data.access_token,
        expiresIn: result.data.expires_in
      });
    } catch (error) {
      console.error("Error getting Twitch client token:", error);
      return res.status(500).json({ error: "Failed to get client token" });
    }
  });

  // Check if channel is live
  app.get('/api/twitch/channel/live', async (req, res) => {
    try {
      const clientId = process.env.TWITCH_CLIENT_ID;
      const accessToken = req.headers.authorization?.split(' ')[1];
      
      if (!clientId || !accessToken) {
        return res.status(400).json({ error: "Missing Twitch credentials" });
      }
      
      // First get user ID from username
      const userResponse = await axios.get(`${TWITCH_API_BASE}/users?login=${TWITCH_CHANNEL_NAME}`, {
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!userResponse.data.data.length) {
        return res.status(404).json({ error: "Channel not found" });
      }
      
      const userId = userResponse.data.data[0].id;
      
      // Then check if user is streaming
      const streamResponse = await axios.get(`${TWITCH_API_BASE}/streams?user_id=${userId}`, {
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      const isLive = streamResponse.data.data.length > 0;
      
      if (isLive) {
        return res.json({
          isLive: true,
          streamData: streamResponse.data.data[0]
        });
      } else {
        return res.json({
          isLive: false
        });
      }
    } catch (error) {
      console.error("Error checking live status:", error);
      return res.status(500).json({ error: "Failed to check live status" });
    }
  });

  // Get channel clips
  app.get('/api/twitch/channel/videos', async (req, res) => {
    try {
      const clientId = process.env.TWITCH_CLIENT_ID;
      const accessToken = req.headers.authorization?.split(' ')[1];
      
      console.log("Videos API called with token:", accessToken ? accessToken.substring(0, 10) + "..." : "none");
      
      if (!clientId || !accessToken) {
        console.log("Missing credentials - Client ID:", !!clientId, "Access Token:", !!accessToken);
        return res.status(400).json({ error: "Missing Twitch credentials" });
      }
      
      // First get user ID from username
      console.log(`Getting user info for channel: ${TWITCH_CHANNEL_NAME}`);
      const userResponse = await axios.get(`${TWITCH_API_BASE}/users?login=${TWITCH_CHANNEL_NAME}`, {
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log("User response data:", JSON.stringify(userResponse.data));
      
      if (!userResponse.data.data.length) {
        console.log("Channel not found");
        return res.status(404).json({ error: "Channel not found" });
      }
      
      const userId = userResponse.data.data[0].id;
      console.log(`Got user ID: ${userId}, fetching clips`);
      
      // Get clips instead of highlights
      const clipsResponse = await axios.get(`${TWITCH_API_BASE}/clips?broadcaster_id=${userId}&first=6`, {
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log(`Received ${clipsResponse.data.data.length} clips from Twitch API`);
      
      // Transform clips data to match expected format in frontend
      const transformedData = clipsResponse.data.data.map((clip: any) => ({
        id: clip.id,
        title: clip.title,
        url: clip.url,
        thumbnail_url: clip.thumbnail_url,
        view_count: clip.view_count,
        duration: "00:30", // Clips are typically short
        created_at: clip.created_at,
        published_at: clip.created_at
      }));
      
      const response = { data: transformedData };
      console.log("Sending response with clips:", JSON.stringify(response));
      return res.json(response);
    } catch (error: any) {
      console.error("Error fetching channel clips:", error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      return res.status(500).json({ error: "Failed to fetch channel clips" });
    }
  });

  // Battle request endpoints
  app.post('/api/battle-requests', async (req, res) => {
    try {
      console.log("Received battle request data:", JSON.stringify(req.body));
      const data = insertBattleRequestSchema.parse(req.body);
      console.log("Parsed battle request data:", JSON.stringify(data));
      
      // Create battle request
      const request = await storage.createBattleRequest(data);
      
      // Return success response before attempting to send email
      res.status(201).json(request);
      
      // Send email notification with better error handling
      try {
        await sendBattleRequestEmail(request);
        console.log("Battle request email sent successfully to admin");
      } catch (err) {
        console.error("Failed to send battle request email:", err);
      }
      
      return;
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Validation error:", JSON.stringify(error.errors));
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating battle request:", error);
      return res.status(500).json({ error: "Failed to create battle request" });
    }
  });

  // Get all battle requests
  app.get('/api/battle-requests', async (req, res) => {
    try {
      const requests = await storage.getBattleRequests();
      return res.json(requests);
    } catch (error) {
      console.error("Error fetching battle requests:", error);
      return res.status(500).json({ error: "Failed to fetch battle requests" });
    }
  });
  
  // Get available time slots for a specific date
  app.get('/api/battle-requests/availability', async (req, res) => {
    try {
      const dateStr = req.query.date as string;
      
      if (!dateStr) {
        return res.status(400).json({ error: "Date parameter is required" });
      }
      
      const date = new Date(dateStr);
      
      // Get all battle requests for validation
      const allRequests = await storage.getBattleRequests();
      
      // Define time slots from 2 PM to midnight
      const allTimeSlots = [
        "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", 
        "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM"
      ];
      
      // Format the requested date for comparison
      const formattedDate = date.toISOString().split('T')[0];
      
      // Check which slots are already taken
      const result = allTimeSlots.map(time => {
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
      
      return res.json(result);
    } catch (error) {
      console.error("Error checking time slot availability:", error);
      return res.status(500).json({ error: "Failed to check time slot availability" });
    }
  });

  // Update battle request status
  app.post('/api/battle-requests/update-status', async (req, res) => {
    try {
      console.log("Received status update data:", JSON.stringify(req.body));
      const { status, token } = updateBattleRequestStatusSchema.parse(req.body);
      
      const request = await storage.updateBattleRequestStatus(token, status);
      
      if (!request) {
        return res.status(404).json({ error: "Battle request not found" });
      }
      
      // Return success response immediately
      res.json(request);
      
      // Send confirmation or rejection email with better error handling
      if (status === 'confirmed') {
        try {
          await sendConfirmationEmail(request);
          console.log(`Confirmation email sent successfully to ${request.email}`);
        } catch (err) {
          console.error("Failed to send confirmation email:", err);
        }
      } else if (status === 'rejected') {
        try {
          await sendRejectionEmail(request);
          console.log(`Rejection email sent successfully to ${request.email}`);
        } catch (err) {
          console.error("Failed to send rejection email:", err);
        }
      }
      
      return;
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Validation error:", JSON.stringify(error.errors));
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating battle request status:", error);
      return res.status(500).json({ error: "Failed to update battle request status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
