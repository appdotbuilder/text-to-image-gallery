import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, imageGenerationsTable, galleryImagesTable } from '../db/schema';
import { type ShareImageInput } from '../schema';
import { shareImage } from '../handlers/share_image';

// Test setup data
const testUser = {
  email: 'testuser@example.com',
  password_hash: 'hashedpassword123',
  username: 'testuser'
};

const anotherUser = {
  email: 'anotheruser@example.com',
  password_hash: 'hashedpassword456',
  username: 'anotheruser'
};

const testImageGeneration = {
  prompt: 'A beautiful sunset',
  image_url: 'https://example.com/image1.jpg',
  image_filename: 'sunset.jpg',
  status: 'completed' as const
};

const testGalleryImage = {
  title: 'My Sunset Image',
  is_public: true
};

const privateGalleryImage = {
  title: 'Private Image',
  is_public: false
};

describe('shareImage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate a share URL for a public gallery image', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test image generation
    const imageGenerations = await db.insert(imageGenerationsTable)
      .values({
        ...testImageGeneration,
        user_id: userId
      })
      .returning()
      .execute();
    const imageGenerationId = imageGenerations[0].id;

    // Create public gallery image
    const galleryImages = await db.insert(galleryImagesTable)
      .values({
        ...testGalleryImage,
        user_id: userId,
        image_generation_id: imageGenerationId
      })
      .returning()
      .execute();
    const galleryImageId = galleryImages[0].id;

    const input: ShareImageInput = {
      gallery_image_id: galleryImageId,
      user_id: userId
    };

    const result = await shareImage(input);

    // Verify share URL format and contains gallery image ID
    expect(result.shareUrl).toContain(`https://app.example.com/shared/image/${galleryImageId}`);
    expect(result.shareUrl).toContain('token=');
    expect(typeof result.shareUrl).toBe('string');
    expect(result.shareUrl.length).toBeGreaterThan(50); // Should include token
  });

  it('should throw error for non-existent gallery image', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    const input: ShareImageInput = {
      gallery_image_id: 999, // Non-existent ID
      user_id: userId
    };

    await expect(shareImage(input)).rejects.toThrow(/not found or you do not have permission/i);
  });

  it('should throw error when user does not own the gallery image', async () => {
    // Create two users
    const users = await db.insert(usersTable)
      .values([testUser, anotherUser])
      .returning()
      .execute();
    const ownerId = users[0].id;
    const unauthorizedUserId = users[1].id;

    // Create image generation for first user
    const imageGenerations = await db.insert(imageGenerationsTable)
      .values({
        ...testImageGeneration,
        user_id: ownerId
      })
      .returning()
      .execute();
    const imageGenerationId = imageGenerations[0].id;

    // Create gallery image owned by first user
    const galleryImages = await db.insert(galleryImagesTable)
      .values({
        ...testGalleryImage,
        user_id: ownerId,
        image_generation_id: imageGenerationId
      })
      .returning()
      .execute();
    const galleryImageId = galleryImages[0].id;

    const input: ShareImageInput = {
      gallery_image_id: galleryImageId,
      user_id: unauthorizedUserId // Different user trying to share
    };

    await expect(shareImage(input)).rejects.toThrow(/not found or you do not have permission/i);
  });

  it('should throw error for private gallery images', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test image generation
    const imageGenerations = await db.insert(imageGenerationsTable)
      .values({
        ...testImageGeneration,
        user_id: userId
      })
      .returning()
      .execute();
    const imageGenerationId = imageGenerations[0].id;

    // Create private gallery image
    const galleryImages = await db.insert(galleryImagesTable)
      .values({
        ...privateGalleryImage,
        user_id: userId,
        image_generation_id: imageGenerationId
      })
      .returning()
      .execute();
    const galleryImageId = galleryImages[0].id;

    const input: ShareImageInput = {
      gallery_image_id: galleryImageId,
      user_id: userId
    };

    await expect(shareImage(input)).rejects.toThrow(/only public images can be shared/i);
  });

  it('should generate unique tokens for multiple share requests', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test image generation
    const imageGenerations = await db.insert(imageGenerationsTable)
      .values({
        ...testImageGeneration,
        user_id: userId
      })
      .returning()
      .execute();
    const imageGenerationId = imageGenerations[0].id;

    // Create public gallery image
    const galleryImages = await db.insert(galleryImagesTable)
      .values({
        ...testGalleryImage,
        user_id: userId,
        image_generation_id: imageGenerationId
      })
      .returning()
      .execute();
    const galleryImageId = galleryImages[0].id;

    const input: ShareImageInput = {
      gallery_image_id: galleryImageId,
      user_id: userId
    };

    // Generate two share URLs
    const result1 = await shareImage(input);
    const result2 = await shareImage(input);

    // URLs should be different (different tokens)
    expect(result1.shareUrl).not.toEqual(result2.shareUrl);
    
    // Both should contain the same base URL and gallery image ID
    expect(result1.shareUrl).toContain(`https://app.example.com/shared/image/${galleryImageId}`);
    expect(result2.shareUrl).toContain(`https://app.example.com/shared/image/${galleryImageId}`);
    
    // Both should have tokens but different ones
    const token1 = result1.shareUrl.split('token=')[1];
    const token2 = result2.shareUrl.split('token=')[1];
    expect(token1).not.toEqual(token2);
    expect(token1.length).toBeGreaterThan(0);
    expect(token2.length).toBeGreaterThan(0);
  });
});