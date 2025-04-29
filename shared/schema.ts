import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Battle request schema
export const battleRequests = pgTable("battleRequests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  twitchUsername: text("twitchUsername").notNull(),
  game: text("game").notNull(),
  notes: text("notes"),
  requestedDate: timestamp("requestedDate").notNull(),
  requestedTime: text("requestedTime").notNull(),
  status: text("status").default("pending").notNull(), // pending, confirmed, rejected
  token: text("token").notNull(), // token for accepting/rejecting
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Create base schema then modify to handle date strings
const baseInsertSchema = createInsertSchema(battleRequests).omit({
  id: true,
  status: true,
  token: true,
  createdAt: true,
});

// Override requestedDate to accept string input (ISO format)
export const insertBattleRequestSchema = baseInsertSchema.extend({
  requestedDate: z.string().or(z.date()),
});

export const updateBattleRequestStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "rejected"]),
  token: z.string(),
});

export type InsertBattleRequest = z.infer<typeof insertBattleRequestSchema>;
export type BattleRequest = typeof battleRequests.$inferSelect;
export type UpdateBattleRequestStatus = z.infer<typeof updateBattleRequestStatusSchema>;

// Twitch Channel Info
export const twitchChannelInfo = z.object({
  id: z.string(),
  login: z.string(),
  display_name: z.string(),
  type: z.string(),
  broadcaster_type: z.string(),
  description: z.string(),
  profile_image_url: z.string(),
  offline_image_url: z.string(),
  view_count: z.number(),
  is_live: z.boolean().optional(),
});

export type TwitchChannelInfo = z.infer<typeof twitchChannelInfo>;

// Twitch Stream Info
export const twitchStreamInfo = z.object({
  id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  game_id: z.string(),
  game_name: z.string(),
  type: z.string(),
  title: z.string(),
  viewer_count: z.number(),
  started_at: z.string(),
  language: z.string(),
  thumbnail_url: z.string(),
  tag_ids: z.array(z.string()).optional(),
  is_mature: z.boolean().optional(),
});

export type TwitchStreamInfo = z.infer<typeof twitchStreamInfo>;

// Twitch Video Info
export const twitchVideoInfo = z.object({
  id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  title: z.string(),
  description: z.string(),
  created_at: z.string(),
  published_at: z.string(),
  url: z.string(),
  thumbnail_url: z.string(),
  viewable: z.string(),
  view_count: z.number(),
  language: z.string(),
  type: z.string(),
  duration: z.string(),
});

export type TwitchVideoInfo = z.infer<typeof twitchVideoInfo>;
