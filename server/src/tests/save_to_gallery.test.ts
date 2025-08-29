import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, imageGenerationsTable, galleryImagesTable } from '../db/schema';
import { type SaveToGalleryInput } from '../schema';
import { saveToGallery } from '../handlers/save_to_gallery';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  username: 'testuser'
};

const testImageGeneration = {
  user_id: 1,
  prompt: 'A beautiful sunset',
  image_url: 'https://example.com/image.jpg',
  image_filename: 'image.jpg',
  status: 'completed' as const
};

const testInput: SaveToGalleryInput = {
  image_generation_id: 1,
  user_id: 1,
  title: 'My Sunset Image',
  is_public: true
};

describe('saveToGallery', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should save an image to gallery successfully', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    // Create completed image generation
    await db.insert(imageGenerationsTable).values(testImageGeneration).execute();

    const result = await saveToGallery(testInput);

    // Verify returned data
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(1);
    expect(result.image_generation_id).toEqual(1);
    expect(result.title).toEqual('My Sunset Image');
    expect(result.is_public).toEqual(true);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save image to gallery with default values', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    // Create completed image generation
    await db.insert(imageGenerationsTable).values(testImageGeneration).execute();

    const inputWithDefaults: SaveToGalleryInput = {
      image_generation_id: 1,
      user_id: 1
    };

    const result = await saveToGallery(inputWithDefaults);

    // Verify default values are applied
    expect(result.title).toBeNull();
    expect(result.is_public).toEqual(false);
    expect(result.user_id).toEqual(1);
    expect(result.image_generation_id).toEqual(1);
  });

  it('should persist gallery image to database', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    // Create completed image generation
    await db.insert(imageGenerationsTable).values(testImageGeneration).execute();

    const result = await saveToGallery(testInput);

    // Query database to verify persistence
    const galleryImages = await db.select()
      .from(galleryImagesTable)
      .where(eq(galleryImagesTable.id, result.id))
      .execute();

    expect(galleryImages).toHaveLength(1);
    expect(galleryImages[0].user_id).toEqual(1);
    expect(galleryImages[0].image_generation_id).toEqual(1);
    expect(galleryImages[0].title).toEqual('My Sunset Image');
    expect(galleryImages[0].is_public).toEqual(true);
    expect(galleryImages[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error if image generation does not exist', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    // Don't create image generation - it should fail

    await expect(saveToGallery(testInput)).rejects.toThrow(/not found.*not completed/i);
  });

  it('should throw error if image generation does not belong to user', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    // Create another user
    const anotherUser = {
      email: 'another@example.com',
      password_hash: 'hashed_password',
      username: 'anotheruser'
    };
    await db.insert(usersTable).values(anotherUser).execute();

    // Create image generation belonging to user 2
    const imageGenerationForUser2 = {
      ...testImageGeneration,
      user_id: 2
    };
    await db.insert(imageGenerationsTable).values(imageGenerationForUser2).execute();

    // Try to save with user 1 - should fail
    await expect(saveToGallery(testInput)).rejects.toThrow(/not found.*not belong.*not completed/i);
  });

  it('should throw error if image generation is not completed', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    // Create pending image generation
    const pendingImageGeneration = {
      ...testImageGeneration,
      status: 'pending' as const
    };
    await db.insert(imageGenerationsTable).values(pendingImageGeneration).execute();

    await expect(saveToGallery(testInput)).rejects.toThrow(/not found.*not completed/i);
  });

  it('should throw error if image generation is already saved to gallery', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    // Create completed image generation
    await db.insert(imageGenerationsTable).values(testImageGeneration).execute();

    // Save to gallery first time
    await saveToGallery(testInput);

    // Try to save again - should fail
    await expect(saveToGallery(testInput)).rejects.toThrow(/already saved to gallery/i);
  });

  it('should handle failed image generation status', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();

    // Create failed image generation
    const failedImageGeneration = {
      ...testImageGeneration,
      status: 'failed' as const
    };
    await db.insert(imageGenerationsTable).values(failedImageGeneration).execute();

    await expect(saveToGallery(testInput)).rejects.toThrow(/not found.*not completed/i);
  });

  it('should allow different users to save the same image generation ID if it belongs to them', async () => {
    // Create two users
    await db.insert(usersTable).values(testUser).execute();
    const user2 = {
      email: 'user2@example.com',
      password_hash: 'hashed_password',
      username: 'user2'
    };
    await db.insert(usersTable).values(user2).execute();

    // Create image generations for both users
    await db.insert(imageGenerationsTable).values(testImageGeneration).execute();
    const imageGeneration2 = {
      ...testImageGeneration,
      user_id: 2
    };
    await db.insert(imageGenerationsTable).values(imageGeneration2).execute();

    // Both should be able to save their respective images
    const result1 = await saveToGallery(testInput);
    const input2: SaveToGalleryInput = {
      ...testInput,
      image_generation_id: 2,
      user_id: 2
    };
    const result2 = await saveToGallery(input2);

    expect(result1.user_id).toEqual(1);
    expect(result1.image_generation_id).toEqual(1);
    expect(result2.user_id).toEqual(2);
    expect(result2.image_generation_id).toEqual(2);
  });
});