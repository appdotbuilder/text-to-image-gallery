import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, imageGenerationsTable, galleryImagesTable } from '../db/schema';
import { downloadImage } from '../handlers/download_image';

describe('downloadImage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: { id: number; email: string; username: string };
  let otherUser: { id: number; email: string; username: string };

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: 'hashed_password',
          username: 'testuser'
        },
        {
          email: 'other@example.com',
          password_hash: 'other_hashed_password',
          username: 'otheruser'
        }
      ])
      .returning({ id: usersTable.id, email: usersTable.email, username: usersTable.username })
      .execute();

    testUser = users[0];
    otherUser = users[1];
  });

  it('should allow user to download their own completed image', async () => {
    // Create completed image generation
    const imageGeneration = await db.insert(imageGenerationsTable)
      .values({
        user_id: testUser.id,
        prompt: 'Test prompt',
        image_url: 'https://storage.example.com/test-image.png',
        image_filename: 'test-image.png',
        status: 'completed'
      })
      .returning()
      .execute();

    const result = await downloadImage(imageGeneration[0].id, testUser.id);

    expect(result.downloadUrl).toEqual('https://storage.example.com/test-image.png');
    expect(result.filename).toEqual('test-image.png');
  });

  it('should allow download of public gallery image by non-owner', async () => {
    // Create completed image generation owned by testUser
    const imageGeneration = await db.insert(imageGenerationsTable)
      .values({
        user_id: testUser.id,
        prompt: 'Test prompt',
        image_url: 'https://storage.example.com/public-image.png',
        image_filename: 'public-image.png',
        status: 'completed'
      })
      .returning()
      .execute();

    // Save to gallery as public
    await db.insert(galleryImagesTable)
      .values({
        user_id: testUser.id,
        image_generation_id: imageGeneration[0].id,
        title: 'Public Image',
        is_public: true
      })
      .execute();

    // Other user should be able to download public image
    const result = await downloadImage(imageGeneration[0].id, otherUser.id);

    expect(result.downloadUrl).toEqual('https://storage.example.com/public-image.png');
    expect(result.filename).toEqual('public-image.png');
  });

  it('should deny access to private image by non-owner', async () => {
    // Create completed image generation owned by testUser
    const imageGeneration = await db.insert(imageGenerationsTable)
      .values({
        user_id: testUser.id,
        prompt: 'Private prompt',
        image_url: 'https://storage.example.com/private-image.png',
        image_filename: 'private-image.png',
        status: 'completed'
      })
      .returning()
      .execute();

    // Save to gallery as private (default)
    await db.insert(galleryImagesTable)
      .values({
        user_id: testUser.id,
        image_generation_id: imageGeneration[0].id,
        title: 'Private Image',
        is_public: false
      })
      .execute();

    // Other user should NOT be able to download private image
    await expect(downloadImage(imageGeneration[0].id, otherUser.id))
      .rejects.toThrow(/access denied/i);
  });

  it('should deny access to non-public image not in gallery by non-owner', async () => {
    // Create completed image generation owned by testUser (not in gallery)
    const imageGeneration = await db.insert(imageGenerationsTable)
      .values({
        user_id: testUser.id,
        prompt: 'Private prompt',
        image_url: 'https://storage.example.com/private-image.png',
        image_filename: 'private-image.png',
        status: 'completed'
      })
      .returning()
      .execute();

    // Other user should NOT be able to download image not in gallery
    await expect(downloadImage(imageGeneration[0].id, otherUser.id))
      .rejects.toThrow(/access denied/i);
  });

  it('should throw error for non-existent image', async () => {
    await expect(downloadImage(99999, testUser.id))
      .rejects.toThrow(/image not found/i);
  });

  it('should throw error for pending image generation', async () => {
    // Create pending image generation
    const imageGeneration = await db.insert(imageGenerationsTable)
      .values({
        user_id: testUser.id,
        prompt: 'Pending prompt',
        image_url: 'https://storage.example.com/pending-image.png',
        image_filename: 'pending-image.png',
        status: 'pending'
      })
      .returning()
      .execute();

    await expect(downloadImage(imageGeneration[0].id, testUser.id))
      .rejects.toThrow(/image generation is not completed/i);
  });

  it('should throw error for failed image generation', async () => {
    // Create failed image generation
    const imageGeneration = await db.insert(imageGenerationsTable)
      .values({
        user_id: testUser.id,
        prompt: 'Failed prompt',
        image_url: '',
        image_filename: 'failed-image.png',
        status: 'failed'
      })
      .returning()
      .execute();

    await expect(downloadImage(imageGeneration[0].id, testUser.id))
      .rejects.toThrow(/image generation is not completed/i);
  });

  it('should handle image with multiple gallery entries correctly', async () => {
    // Create completed image generation
    const imageGeneration = await db.insert(imageGenerationsTable)
      .values({
        user_id: testUser.id,
        prompt: 'Test prompt',
        image_url: 'https://storage.example.com/multi-gallery-image.png',
        image_filename: 'multi-gallery-image.png',
        status: 'completed'
      })
      .returning()
      .execute();

    // Create multiple gallery entries (one private, one public)
    await db.insert(galleryImagesTable)
      .values([
        {
          user_id: testUser.id,
          image_generation_id: imageGeneration[0].id,
          title: 'Private Version',
          is_public: false
        },
        {
          user_id: testUser.id,
          image_generation_id: imageGeneration[0].id,
          title: 'Public Version',
          is_public: true
        }
      ])
      .execute();

    // Other user should be able to download because at least one gallery entry is public
    const result = await downloadImage(imageGeneration[0].id, otherUser.id);

    expect(result.downloadUrl).toEqual('https://storage.example.com/multi-gallery-image.png');
    expect(result.filename).toEqual('multi-gallery-image.png');
  });
});