import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  username: z.string(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Auth schemas
export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(50)
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const authResponseSchema = z.object({
  user: userSchema.omit({ password_hash: true }),
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Image generation schema
export const imageGenerationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  prompt: z.string(),
  image_url: z.string(),
  image_filename: z.string(),
  status: z.enum(['pending', 'completed', 'failed']),
  created_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable()
});

export type ImageGeneration = z.infer<typeof imageGenerationSchema>;

// Generate image input schema
export const generateImageInputSchema = z.object({
  prompt: z.string().min(1).max(1000),
  user_id: z.number()
});

export type GenerateImageInput = z.infer<typeof generateImageInputSchema>;

// Gallery schema for saved images
export const galleryImageSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  image_generation_id: z.number(),
  title: z.string().nullable(),
  is_public: z.boolean(),
  created_at: z.coerce.date()
});

export type GalleryImage = z.infer<typeof galleryImageSchema>;

// Save to gallery input schema
export const saveToGalleryInputSchema = z.object({
  image_generation_id: z.number(),
  user_id: z.number(),
  title: z.string().optional(),
  is_public: z.boolean().optional()
});

export type SaveToGalleryInput = z.infer<typeof saveToGalleryInputSchema>;

// Update gallery image schema
export const updateGalleryImageInputSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string().optional(),
  is_public: z.boolean().optional()
});

export type UpdateGalleryImageInput = z.infer<typeof updateGalleryImageInputSchema>;

// Share image schema
export const shareImageInputSchema = z.object({
  gallery_image_id: z.number(),
  user_id: z.number()
});

export type ShareImageInput = z.infer<typeof shareImageInputSchema>;

// Get user gallery input schema
export const getUserGalleryInputSchema = z.object({
  user_id: z.number(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetUserGalleryInput = z.infer<typeof getUserGalleryInputSchema>;

// Get image generations input schema
export const getUserImageGenerationsInputSchema = z.object({
  user_id: z.number(),
  status: z.enum(['pending', 'completed', 'failed']).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetUserImageGenerationsInput = z.infer<typeof getUserImageGenerationsInputSchema>;

// Delete gallery image input schema
export const deleteGalleryImageInputSchema = z.object({
  id: z.number(),
  user_id: z.number()
});

export type DeleteGalleryImageInput = z.infer<typeof deleteGalleryImageInputSchema>;