import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const itineraries = sqliteTable("itineraries", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const placeFeedback = sqliteTable("place_feedback", {
  id: text("id").primaryKey(),
  placeId: text("place_id").notNull(),
  placeName: text("place_name").notNull(),
  field: text("field").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("received"),
  createdAt: integer("created_at").notNull(),
});
