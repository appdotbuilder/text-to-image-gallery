import { db } from '../db';
import { imageGenerationsTable, galleryImagesTable } from '../db/schema';
import { eq, and, or } from 'drizzle-orm';

export async function downloadImage(imageGenerationId: number, userId: number): Promise<{ downloadUrl: string; filename: string }> {
  try {
    // First, get the image generation details
    const imageGeneration = await db.select()
      .from(imageGenerationsTable)
      .where(eq(imageGenerationsTable.id, imageGenerationId))
      .execute();

    if (imageGeneration.length === 0) {
      throw new Error('Image not found');
    }

    const imageData = imageGeneration[0];

    // Check if image generation is completed
    if (imageData.status !== 'completed') {
      throw new Error('Image generation is not completed');
    }

    // If user owns the image, they can download it
    if (imageData.user_id === userId) {
      return {
        downloadUrl: imageData.image_url,
        filename: imageData.image_filename
      };
    }

    // If user doesn't own the image, check if it's publicly accessible through gallery
    const publicGalleryEntries = await db.select()
      .from(galleryImagesTable)
      .where(
        and(
          eq(galleryImagesTable.image_generation_id, imageGenerationId),
          eq(galleryImagesTable.is_public, true)
        )
      )
      .execute();

    if (publicGalleryEntries.length > 0) {
      return {
        downloadUrl: imageData.image_url,
        filename: imageData.image_filename
      };
    }

    // No access - not owner and not public
    throw new Error('Access denied');
  } catch (error) {
    console.error('Download image failed:', error);
    throw error;
  }
}