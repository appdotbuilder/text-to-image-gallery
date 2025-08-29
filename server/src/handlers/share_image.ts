import { db } from '../db';
import { galleryImagesTable } from '../db/schema';
import { type ShareImageInput } from '../schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export async function shareImage(input: ShareImageInput): Promise<{ shareUrl: string }> {
  try {
    // 1. Validate the user owns the gallery image and check if it's public
    const galleryImages = await db.select()
      .from(galleryImagesTable)
      .where(
        and(
          eq(galleryImagesTable.id, input.gallery_image_id),
          eq(galleryImagesTable.user_id, input.user_id)
        )
      )
      .execute();

    if (galleryImages.length === 0) {
      throw new Error('Gallery image not found or you do not have permission to share it');
    }

    const galleryImage = galleryImages[0];

    // 2. Check if the image can be shared (must be public)
    if (!galleryImage.is_public) {
      throw new Error('Only public images can be shared');
    }

    // 3. Generate a unique share token for additional security
    const shareToken = randomBytes(32).toString('hex');

    // 4. Create a shareable URL with the gallery image ID and token
    // In a real implementation, you might store this token in a shares table
    // For now, we'll just use the gallery image ID as a simple sharing mechanism
    const shareUrl = `https://app.example.com/shared/image/${galleryImage.id}?token=${shareToken}`;

    return { shareUrl };
  } catch (error) {
    console.error('Share image failed:', error);
    throw error;
  }
}