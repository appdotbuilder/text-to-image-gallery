import { db } from '../db';
import { galleryImagesTable } from '../db/schema';
import { type UpdateGalleryImageInput, type GalleryImage } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateGalleryImage(input: UpdateGalleryImageInput): Promise<GalleryImage> {
  try {
    // First, verify the gallery image exists and belongs to the user
    const existing = await db.select()
      .from(galleryImagesTable)
      .where(
        and(
          eq(galleryImagesTable.id, input.id),
          eq(galleryImagesTable.user_id, input.user_id)
        )
      )
      .execute();

    if (existing.length === 0) {
      throw new Error('Gallery image not found or does not belong to user');
    }

    // Build update values object with only provided fields
    const updateValues: Partial<{
      title: string | null;
      is_public: boolean;
    }> = {};

    if ('title' in input) {
      updateValues.title = input.title === undefined ? null : input.title;
    }

    if (input.is_public !== undefined) {
      updateValues.is_public = input.is_public;
    }

    // If no fields to update, return the existing record
    if (Object.keys(updateValues).length === 0) {
      return existing[0];
    }

    // Update the gallery image
    const result = await db.update(galleryImagesTable)
      .set(updateValues)
      .where(
        and(
          eq(galleryImagesTable.id, input.id),
          eq(galleryImagesTable.user_id, input.user_id)
        )
      )
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Gallery image update failed:', error);
    throw error;
  }
}