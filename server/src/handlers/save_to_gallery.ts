import { db } from '../db';
import { imageGenerationsTable, galleryImagesTable } from '../db/schema';
import { type SaveToGalleryInput, type GalleryImage } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function saveToGallery(input: SaveToGalleryInput): Promise<GalleryImage> {
  try {
    // 1. Validate that the image generation exists, belongs to the user, and is completed
    const imageGenerations = await db.select()
      .from(imageGenerationsTable)
      .where(
        and(
          eq(imageGenerationsTable.id, input.image_generation_id),
          eq(imageGenerationsTable.user_id, input.user_id),
          eq(imageGenerationsTable.status, 'completed')
        )
      )
      .execute();

    if (imageGenerations.length === 0) {
      throw new Error('Image generation not found, does not belong to user, or is not completed');
    }

    // 2. Check if this image generation is already saved to gallery
    const existingGalleryImages = await db.select()
      .from(galleryImagesTable)
      .where(
        and(
          eq(galleryImagesTable.image_generation_id, input.image_generation_id),
          eq(galleryImagesTable.user_id, input.user_id)
        )
      )
      .execute();

    if (existingGalleryImages.length > 0) {
      throw new Error('Image generation is already saved to gallery');
    }

    // 3. Create gallery image record
    const result = await db.insert(galleryImagesTable)
      .values({
        user_id: input.user_id,
        image_generation_id: input.image_generation_id,
        title: input.title || null,
        is_public: input.is_public || false
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Save to gallery failed:', error);
    throw error;
  }
}