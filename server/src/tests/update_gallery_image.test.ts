import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, imageGenerationsTable, galleryImagesTable } from '../db/schema';
import { type UpdateGalleryImageInput } from '../schema';
import { updateGalleryImage } from '../handlers/update_gallery_image';
import { eq } from 'drizzle-orm';

describe('updateGalleryImage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let otherUserId: number;
  let testImageGenerationId: number;
  let testGalleryImageId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: 'hashedpassword',
          username: 'testuser'
        },
        {
          email: 'other@example.com',
          password_hash: 'hashedpassword',
          username: 'otheruser'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test image generation
    const imageGeneration = await db.insert(imageGenerationsTable)
      .values({
        user_id: testUserId,
        prompt: 'test prompt',
        image_url: 'http://example.com/image.jpg',
        image_filename: 'image.jpg',
        status: 'completed'
      })
      .returning()
      .execute();

    testImageGenerationId = imageGeneration[0].id;

    // Create test gallery image
    const galleryImage = await db.insert(galleryImagesTable)
      .values({
        user_id: testUserId,
        image_generation_id: testImageGenerationId,
        title: 'Original Title',
        is_public: false
      })
      .returning()
      .execute();

    testGalleryImageId = galleryImage[0].id;
  });

  it('should update gallery image title', async () => {
    const input: UpdateGalleryImageInput = {
      id: testGalleryImageId,
      user_id: testUserId,
      title: 'Updated Title'
    };

    const result = await updateGalleryImage(input);

    expect(result.id).toEqual(testGalleryImageId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.image_generation_id).toEqual(testImageGenerationId);
    expect(result.title).toEqual('Updated Title');
    expect(result.is_public).toEqual(false); // Should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update gallery image public status', async () => {
    const input: UpdateGalleryImageInput = {
      id: testGalleryImageId,
      user_id: testUserId,
      is_public: true
    };

    const result = await updateGalleryImage(input);

    expect(result.id).toEqual(testGalleryImageId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.title).toEqual('Original Title'); // Should remain unchanged
    expect(result.is_public).toEqual(true);
  });

  it('should update both title and public status', async () => {
    const input: UpdateGalleryImageInput = {
      id: testGalleryImageId,
      user_id: testUserId,
      title: 'New Title',
      is_public: true
    };

    const result = await updateGalleryImage(input);

    expect(result.title).toEqual('New Title');
    expect(result.is_public).toEqual(true);
  });

  it('should save changes to database', async () => {
    const input: UpdateGalleryImageInput = {
      id: testGalleryImageId,
      user_id: testUserId,
      title: 'Database Test Title',
      is_public: true
    };

    await updateGalleryImage(input);

    // Verify changes were saved to database
    const galleryImages = await db.select()
      .from(galleryImagesTable)
      .where(eq(galleryImagesTable.id, testGalleryImageId))
      .execute();

    expect(galleryImages).toHaveLength(1);
    expect(galleryImages[0].title).toEqual('Database Test Title');
    expect(galleryImages[0].is_public).toEqual(true);
  });

  it('should return existing record when no fields to update', async () => {
    const input: UpdateGalleryImageInput = {
      id: testGalleryImageId,
      user_id: testUserId
    };

    const result = await updateGalleryImage(input);

    expect(result.id).toEqual(testGalleryImageId);
    expect(result.title).toEqual('Original Title');
    expect(result.is_public).toEqual(false);
  });

  it('should allow setting title to undefined (null)', async () => {
    const input: UpdateGalleryImageInput = {
      id: testGalleryImageId,
      user_id: testUserId,
      title: undefined
    };

    const result = await updateGalleryImage(input);

    expect(result.title).toBeNull();
  });

  it('should throw error when gallery image does not exist', async () => {
    const input: UpdateGalleryImageInput = {
      id: 99999, // Non-existent ID
      user_id: testUserId,
      title: 'New Title'
    };

    expect(updateGalleryImage(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error when user does not own the gallery image', async () => {
    const input: UpdateGalleryImageInput = {
      id: testGalleryImageId,
      user_id: otherUserId, // Different user
      title: 'Unauthorized Update'
    };

    expect(updateGalleryImage(input)).rejects.toThrow(/not found.*belong/i);
  });

  it('should handle empty string title', async () => {
    const input: UpdateGalleryImageInput = {
      id: testGalleryImageId,
      user_id: testUserId,
      title: ''
    };

    const result = await updateGalleryImage(input);

    expect(result.title).toEqual('');
  });

  it('should toggle public status correctly', async () => {
    // First make it public
    await updateGalleryImage({
      id: testGalleryImageId,
      user_id: testUserId,
      is_public: true
    });

    // Then make it private again
    const result = await updateGalleryImage({
      id: testGalleryImageId,
      user_id: testUserId,
      is_public: false
    });

    expect(result.is_public).toEqual(false);
  });
});