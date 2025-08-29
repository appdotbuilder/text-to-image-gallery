import { db } from '../db';
import { galleryImagesTable, imageGenerationsTable } from '../db/schema';
import { type GetUserGalleryInput, type GalleryImage } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserGallery(input: GetUserGalleryInput): Promise<GalleryImage[]> {
  try {
    // Build the base query with join to get image generation data
    let query = db.select()
      .from(galleryImagesTable)
      .innerJoin(
        imageGenerationsTable,
        eq(galleryImagesTable.image_generation_id, imageGenerationsTable.id)
      )
      .where(eq(galleryImagesTable.user_id, input.user_id))
      .orderBy(desc(galleryImagesTable.created_at));

    // Build the final query with optional pagination
    const finalQuery = input.limit !== undefined
      ? (input.offset !== undefined 
          ? query.limit(input.limit).offset(input.offset)
          : query.limit(input.limit))
      : (input.offset !== undefined 
          ? query.offset(input.offset)
          : query);

    const results = await finalQuery;

    // Map the joined results back to the expected GalleryImage format
    return results.map(result => ({
      id: result.gallery_images.id,
      user_id: result.gallery_images.user_id,
      image_generation_id: result.gallery_images.image_generation_id,
      title: result.gallery_images.title,
      is_public: result.gallery_images.is_public,
      created_at: result.gallery_images.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch user gallery:', error);
    throw error;
  }
}