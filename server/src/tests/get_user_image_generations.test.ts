import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, imageGenerationsTable } from '../db/schema';
import { type GetUserImageGenerationsInput } from '../schema';
import { getUserImageGenerations } from '../handlers/get_user_image_generations';
import { eq } from 'drizzle-orm';

describe('getUserImageGenerations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helper
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        username: 'testuser'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createImageGeneration = async (userId: number, status: 'pending' | 'completed' | 'failed' = 'completed', prompt = 'test prompt') => {
    const result = await db.insert(imageGenerationsTable)
      .values({
        user_id: userId,
        prompt,
        image_url: 'https://example.com/image.jpg',
        image_filename: 'image.jpg',
        status,
        completed_at: status === 'completed' ? new Date() : null
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should return user image generations ordered by newest first', async () => {
    const user = await createTestUser();
    
    // Create generations with slight delay to ensure different timestamps
    const gen1 = await createImageGeneration(user.id, 'completed', 'first prompt');
    await new Promise(resolve => setTimeout(resolve, 10));
    const gen2 = await createImageGeneration(user.id, 'completed', 'second prompt');
    await new Promise(resolve => setTimeout(resolve, 10));
    const gen3 = await createImageGeneration(user.id, 'pending', 'third prompt');

    const input: GetUserImageGenerationsInput = {
      user_id: user.id
    };

    const results = await getUserImageGenerations(input);

    expect(results).toHaveLength(3);
    
    // Should be ordered by newest first
    expect(results[0].id).toBe(gen3.id);
    expect(results[0].prompt).toBe('third prompt');
    expect(results[0].status).toBe('pending');
    
    expect(results[1].id).toBe(gen2.id);
    expect(results[1].prompt).toBe('second prompt');
    
    expect(results[2].id).toBe(gen1.id);
    expect(results[2].prompt).toBe('first prompt');

    // Verify all results belong to the correct user
    results.forEach(gen => {
      expect(gen.user_id).toBe(user.id);
      expect(gen.created_at).toBeInstanceOf(Date);
    });
  });

  it('should filter by status when provided', async () => {
    const user = await createTestUser();
    
    await createImageGeneration(user.id, 'completed');
    await createImageGeneration(user.id, 'pending');
    await createImageGeneration(user.id, 'failed');
    await createImageGeneration(user.id, 'pending');

    const input: GetUserImageGenerationsInput = {
      user_id: user.id,
      status: 'pending'
    };

    const results = await getUserImageGenerations(input);

    expect(results).toHaveLength(2);
    results.forEach(gen => {
      expect(gen.status).toBe('pending');
      expect(gen.user_id).toBe(user.id);
    });
  });

  it('should apply pagination correctly', async () => {
    const user = await createTestUser();
    
    // Create 5 generations
    for (let i = 0; i < 5; i++) {
      await createImageGeneration(user.id, 'completed', `prompt ${i}`);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Test limit
    const limitInput: GetUserImageGenerationsInput = {
      user_id: user.id,
      limit: 2
    };

    const limitResults = await getUserImageGenerations(limitInput);
    expect(limitResults).toHaveLength(2);

    // Test offset
    const offsetInput: GetUserImageGenerationsInput = {
      user_id: user.id,
      limit: 2,
      offset: 2
    };

    const offsetResults = await getUserImageGenerations(offsetInput);
    expect(offsetResults).toHaveLength(2);
    
    // Verify different results (pagination working)
    expect(limitResults[0].id).not.toBe(offsetResults[0].id);
  });

  it('should return empty array for user with no generations', async () => {
    const user = await createTestUser();

    const input: GetUserImageGenerationsInput = {
      user_id: user.id
    };

    const results = await getUserImageGenerations(input);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should only return generations for specified user', async () => {
    const user1 = await createTestUser();
    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        username: 'testuser2'
      })
      .returning()
      .execute()
      .then(result => result[0]);

    // Create generations for both users
    await createImageGeneration(user1.id, 'completed', 'user1 prompt');
    await createImageGeneration(user2.id, 'completed', 'user2 prompt');
    await createImageGeneration(user1.id, 'pending', 'user1 pending');

    const input: GetUserImageGenerationsInput = {
      user_id: user1.id
    };

    const results = await getUserImageGenerations(input);

    expect(results).toHaveLength(2);
    results.forEach(gen => {
      expect(gen.user_id).toBe(user1.id);
    });
  });

  it('should handle combined status filter and pagination', async () => {
    const user = await createTestUser();
    
    // Create mix of statuses
    await createImageGeneration(user.id, 'completed');
    await createImageGeneration(user.id, 'pending');
    await createImageGeneration(user.id, 'completed');
    await createImageGeneration(user.id, 'pending');
    await createImageGeneration(user.id, 'completed');

    const input: GetUserImageGenerationsInput = {
      user_id: user.id,
      status: 'completed',
      limit: 2,
      offset: 1
    };

    const results = await getUserImageGenerations(input);

    expect(results).toHaveLength(2);
    results.forEach(gen => {
      expect(gen.status).toBe('completed');
      expect(gen.user_id).toBe(user.id);
    });
  });

  it('should verify database records match returned data', async () => {
    const user = await createTestUser();
    const generation = await createImageGeneration(user.id, 'completed', 'verification prompt');

    const input: GetUserImageGenerationsInput = {
      user_id: user.id
    };

    const results = await getUserImageGenerations(input);

    // Verify against database
    const dbRecord = await db.select()
      .from(imageGenerationsTable)
      .where(eq(imageGenerationsTable.id, generation.id))
      .execute()
      .then(result => result[0]);

    expect(results).toHaveLength(1);
    const returnedRecord = results[0];

    expect(returnedRecord.id).toBe(dbRecord.id);
    expect(returnedRecord.user_id).toBe(dbRecord.user_id);
    expect(returnedRecord.prompt).toBe(dbRecord.prompt);
    expect(returnedRecord.image_url).toBe(dbRecord.image_url);
    expect(returnedRecord.image_filename).toBe(dbRecord.image_filename);
    expect(returnedRecord.status).toBe(dbRecord.status);
    expect(returnedRecord.created_at).toEqual(dbRecord.created_at);
    expect(returnedRecord.completed_at).toEqual(dbRecord.completed_at);
  });
});