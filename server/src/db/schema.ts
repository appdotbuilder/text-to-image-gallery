import { serial, text, pgTable, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for image generation status
export const imageStatusEnum = pgEnum('image_status', ['pending', 'completed', 'failed']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  username: text('username').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Image generations table
export const imageGenerationsTable = pgTable('image_generations', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  prompt: text('prompt').notNull(),
  image_url: text('image_url').notNull(),
  image_filename: text('image_filename').notNull(),
  status: imageStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
});

// Gallery images table (saved images from generations)
export const galleryImagesTable = pgTable('gallery_images', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  image_generation_id: integer('image_generation_id').notNull(),
  title: text('title'),
  is_public: boolean('is_public').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  imageGenerations: many(imageGenerationsTable),
  galleryImages: many(galleryImagesTable),
}));

export const imageGenerationsRelations = relations(imageGenerationsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [imageGenerationsTable.user_id],
    references: [usersTable.id],
  }),
  galleryImages: many(galleryImagesTable),
}));

export const galleryImagesRelations = relations(galleryImagesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [galleryImagesTable.user_id],
    references: [usersTable.id],
  }),
  imageGeneration: one(imageGenerationsTable, {
    fields: [galleryImagesTable.image_generation_id],
    references: [imageGenerationsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type ImageGeneration = typeof imageGenerationsTable.$inferSelect;
export type NewImageGeneration = typeof imageGenerationsTable.$inferInsert;

export type GalleryImage = typeof galleryImagesTable.$inferSelect;
export type NewGalleryImage = typeof galleryImagesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  imageGenerations: imageGenerationsTable,
  galleryImages: galleryImagesTable,
};

export const tableRelations = {
  usersRelations,
  imageGenerationsRelations,
  galleryImagesRelations,
};