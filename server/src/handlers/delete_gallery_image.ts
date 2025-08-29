import { db } from '../db';
import { galleryImagesTable } from '../db/schema';
import { type DeleteGalleryImageInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function deleteGalleryImage(input: DeleteGalleryImageInput): Promise<{ success: boolean }> {
  try {
    // First, check if the gallery image exists and belongs to the user
    const existingImage = await db.select()
      .from(galleryImagesTable)
      .where(
        and(
          eq(galleryImagesTable.id, input.id),
          eq(galleryImagesTable.user_id, input.user_id)
        )
      )
      .execute();

    if (existingImage.length === 0) {
      throw new Error('Gallery image not found or does not belong to user');
    }

    // Delete the gallery image record
    const result = await db.delete(galleryImagesTable)
      .where(
        and(
          eq(galleryImagesTable.id, input.id),
          eq(galleryImagesTable.user_id, input.user_id)
        )
      )
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Gallery image deletion failed:', error);
    throw error;
  }
}