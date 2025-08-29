import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, imageGenerationsTable, galleryImagesTable } from '../db/schema';
import { type DeleteGalleryImageInput } from '../schema';
import { deleteGalleryImage } from '../handlers/delete_gallery_image';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  username: 'testuser'
};

const testUser2 = {
  email: 'test2@example.com',
  password_hash: 'hashed_password2',
  username: 'testuser2'
};

const testImageGeneration = {
  prompt: 'A test image',
  image_url: 'https://example.com/image.jpg',
  image_filename: 'test_image.jpg',
  status: 'completed' as const
};

const testGalleryImage = {
  title: 'Test Gallery Image',
  is_public: false
};

describe('deleteGalleryImage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a gallery image successfully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test image generation
    const imageGenResult = await db.insert(imageGenerationsTable)
      .values({ ...testImageGeneration, user_id: userId })
      .returning()
      .execute();
    const imageGenerationId = imageGenResult[0].id;

    // Create test gallery image
    const galleryResult = await db.insert(galleryImagesTable)
      .values({
        ...testGalleryImage,
        user_id: userId,
        image_generation_id: imageGenerationId
      })
      .returning()
      .execute();
    const galleryImageId = galleryResult[0].id;

    const input: DeleteGalleryImageInput = {
      id: galleryImageId,
      user_id: userId
    };

    // Delete the gallery image
    const result = await deleteGalleryImage(input);

    // Verify success response
    expect(result.success).toBe(true);

    // Verify the gallery image was deleted from database
    const deletedImage = await db.select()
      .from(galleryImagesTable)
      .where(eq(galleryImagesTable.id, galleryImageId))
      .execute();

    expect(deletedImage).toHaveLength(0);
  });

  it('should throw error when gallery image does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: DeleteGalleryImageInput = {
      id: 99999, // Non-existent ID
      user_id: userId
    };

    // Should throw error for non-existent gallery image
    await expect(deleteGalleryImage(input)).rejects.toThrow(/gallery image not found/i);
  });

  it('should throw error when user does not own the gallery image', async () => {
    // Create two test users
    const userResult1 = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId1 = userResult1[0].id;

    const userResult2 = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();
    const userId2 = userResult2[0].id;

    // Create test image generation for user 1
    const imageGenResult = await db.insert(imageGenerationsTable)
      .values({ ...testImageGeneration, user_id: userId1 })
      .returning()
      .execute();
    const imageGenerationId = imageGenResult[0].id;

    // Create test gallery image for user 1
    const galleryResult = await db.insert(galleryImagesTable)
      .values({
        ...testGalleryImage,
        user_id: userId1,
        image_generation_id: imageGenerationId
      })
      .returning()
      .execute();
    const galleryImageId = galleryResult[0].id;

    const input: DeleteGalleryImageInput = {
      id: galleryImageId,
      user_id: userId2 // Different user trying to delete
    };

    // Should throw error when user doesn't own the gallery image
    await expect(deleteGalleryImage(input)).rejects.toThrow(/does not belong to user/i);

    // Verify the gallery image still exists
    const existingImage = await db.select()
      .from(galleryImagesTable)
      .where(eq(galleryImagesTable.id, galleryImageId))
      .execute();

    expect(existingImage).toHaveLength(1);
  });

  it('should verify gallery image exists before deletion', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test image generation
    const imageGenResult = await db.insert(imageGenerationsTable)
      .values({ ...testImageGeneration, user_id: userId })
      .returning()
      .execute();
    const imageGenerationId = imageGenResult[0].id;

    // Create test gallery image
    const galleryResult = await db.insert(galleryImagesTable)
      .values({
        ...testGalleryImage,
        user_id: userId,
        image_generation_id: imageGenerationId
      })
      .returning()
      .execute();
    const galleryImageId = galleryResult[0].id;

    // Verify gallery image exists before deletion
    const beforeDeletion = await db.select()
      .from(galleryImagesTable)
      .where(
        and(
          eq(galleryImagesTable.id, galleryImageId),
          eq(galleryImagesTable.user_id, userId)
        )
      )
      .execute();

    expect(beforeDeletion).toHaveLength(1);
    expect(beforeDeletion[0].title).toEqual('Test Gallery Image');
    expect(beforeDeletion[0].is_public).toBe(false);

    const input: DeleteGalleryImageInput = {
      id: galleryImageId,
      user_id: userId
    };

    // Delete the gallery image
    const result = await deleteGalleryImage(input);
    expect(result.success).toBe(true);

    // Verify gallery image no longer exists
    const afterDeletion = await db.select()
      .from(galleryImagesTable)
      .where(
        and(
          eq(galleryImagesTable.id, galleryImageId),
          eq(galleryImagesTable.user_id, userId)
        )
      )
      .execute();

    expect(afterDeletion).toHaveLength(0);
  });

  it('should only delete the specified gallery image', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test image generation
    const imageGenResult = await db.insert(imageGenerationsTable)
      .values({ ...testImageGeneration, user_id: userId })
      .returning()
      .execute();
    const imageGenerationId = imageGenResult[0].id;

    // Create multiple test gallery images
    const galleryResult1 = await db.insert(galleryImagesTable)
      .values({
        ...testGalleryImage,
        title: 'First Gallery Image',
        user_id: userId,
        image_generation_id: imageGenerationId
      })
      .returning()
      .execute();

    const galleryResult2 = await db.insert(galleryImagesTable)
      .values({
        ...testGalleryImage,
        title: 'Second Gallery Image',
        user_id: userId,
        image_generation_id: imageGenerationId
      })
      .returning()
      .execute();

    const galleryImageId1 = galleryResult1[0].id;
    const galleryImageId2 = galleryResult2[0].id;

    const input: DeleteGalleryImageInput = {
      id: galleryImageId1,
      user_id: userId
    };

    // Delete only the first gallery image
    const result = await deleteGalleryImage(input);
    expect(result.success).toBe(true);

    // Verify first gallery image was deleted
    const deletedImage = await db.select()
      .from(galleryImagesTable)
      .where(eq(galleryImagesTable.id, galleryImageId1))
      .execute();

    expect(deletedImage).toHaveLength(0);

    // Verify second gallery image still exists
    const remainingImage = await db.select()
      .from(galleryImagesTable)
      .where(eq(galleryImagesTable.id, galleryImageId2))
      .execute();

    expect(remainingImage).toHaveLength(1);
    expect(remainingImage[0].title).toEqual('Second Gallery Image');
  });
});