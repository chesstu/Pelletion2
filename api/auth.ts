import { storage } from '../server/storage';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import type { Request, Response } from 'express';

const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export default async function handler(req: Request, res: Response) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  
  try {
    // Get the user by username
    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    // Check if password matches
    const passwordMatches = await comparePasswords(password, user.password);
    
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    // Create a session token
    const sessionToken = randomBytes(32).toString('hex');
    
    // Return the session token and user info (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(200).json({
      user: userWithoutPassword,
      token: sessionToken,
      message: "Login successful"
    });
  } catch (error) {
    console.error("Error during authentication:", error);
    return res.status(500).json({ error: "Authentication failed due to server error" });
  }
}