import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, imageGenerationsTable } from '../db/schema';
import { type GenerateImageInput } from '../schema';
import { generateImage } from '../handlers/generate_image';
import { eq } from 'drizzle-orm';

describe('generateImage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: { id: number; email: string; username: string };

  beforeEach(async () => {
    // Create a test user for each test
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        username: 'testuser'
      })
      .returning()
      .execute();

    testUser = userResult[0];
  });

  it('should create image generation record with pending status initially', async () => {
    const input: GenerateImageInput = {
      prompt: 'A beautiful sunset over mountains',
      user_id: testUser.id
    };

    const result = await generateImage(input);

    // Verify the result structure
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUser.id);
    expect(result.prompt).toEqual(input.prompt);
    expect(result.image_filename).toMatch(/^generated_[\w-]+\.png$/);
    expect(result.status).toEqual('completed'); // Should be completed after successful generation
    expect(result.image_url).toMatch(/^https:\/\/generated-images\.example\.com\//);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeInstanceOf(Date);
  });

  it('should save image generation record to database', async () => {
    const input: GenerateImageInput = {
      prompt: 'A majestic eagle soaring through clouds',
      user_id: testUser.id
    };

    const result = await generateImage(input);

    // Query the database to verify record was saved
    const savedRecords = await db.select()
      .from(imageGenerationsTable)
      .where(eq(imageGenerationsTable.id, result.id))
      .execute();

    expect(savedRecords).toHaveLength(1);
    
    const savedRecord = savedRecords[0];
    expect(savedRecord.user_id).toEqual(testUser.id);
    expect(savedRecord.prompt).toEqual(input.prompt);
    expect(savedRecord.status).toEqual('completed');
    expect(savedRecord.image_url).toBeTruthy();
    expect(savedRecord.image_filename).toMatch(/^generated_[\w-]+\.png$/);
    expect(savedRecord.created_at).toBeInstanceOf(Date);
    expect(savedRecord.completed_at).toBeInstanceOf(Date);
  });

  it('should handle image generation failure gracefully', async () => {
    const input: GenerateImageInput = {
      prompt: 'This prompt contains error keyword to trigger failure',
      user_id: testUser.id
    };

    const result = await generateImage(input);

    // Verify the generation failed but record was still created
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUser.id);
    expect(result.prompt).toEqual(input.prompt);
    expect(result.status).toEqual('failed');
    expect(result.image_url).toEqual(''); // Should be empty on failure
    expect(result.completed_at).toBeInstanceOf(Date);

    // Verify the failed record was saved to database
    const savedRecords = await db.select()
      .from(imageGenerationsTable)
      .where(eq(imageGenerationsTable.id, result.id))
      .execute();

    expect(savedRecords).toHaveLength(1);
    expect(savedRecords[0].status).toEqual('failed');
  });

  it('should throw error for non-existent user', async () => {
    const input: GenerateImageInput = {
      prompt: 'A colorful abstract painting',
      user_id: 99999 // Non-existent user ID
    };

    await expect(generateImage(input)).rejects.toThrow(/user not found/i);
  });

  it('should generate unique filenames for different requests', async () => {
    const input1: GenerateImageInput = {
      prompt: 'First image prompt',
      user_id: testUser.id
    };

    const input2: GenerateImageInput = {
      prompt: 'Second image prompt',
      user_id: testUser.id
    };

    const [result1, result2] = await Promise.all([
      generateImage(input1),
      generateImage(input2)
    ]);

    // Filenames should be different
    expect(result1.image_filename).not.toEqual(result2.image_filename);
    
    // Both should follow the expected pattern
    expect(result1.image_filename).toMatch(/^generated_[\w-]+\.png$/);
    expect(result2.image_filename).toMatch(/^generated_[\w-]+\.png$/);
  });

  it('should handle multiple image generations for same user', async () => {
    const prompts = [
      'A serene lake at dawn',
      'A bustling city street',
      'A peaceful forest clearing'
    ];

    const results = await Promise.all(
      prompts.map(prompt => generateImage({
        prompt,
        user_id: testUser.id
      }))
    );

    // All should be successful
    results.forEach((result, index) => {
      expect(result.status).toEqual('completed');
      expect(result.prompt).toEqual(prompts[index]);
      expect(result.user_id).toEqual(testUser.id);
      expect(result.image_url).toBeTruthy();
    });

    // Verify all records were saved to database
    const allUserGenerations = await db.select()
      .from(imageGenerationsTable)
      .where(eq(imageGenerationsTable.user_id, testUser.id))
      .execute();

    expect(allUserGenerations).toHaveLength(3);
    
    // Check that all prompts are represented
    const savedPrompts = allUserGenerations.map(gen => gen.prompt).sort();
    expect(savedPrompts).toEqual(prompts.sort());
  });

  it('should validate prompt content and user association', async () => {
    const input: GenerateImageInput = {
      prompt: 'A detailed portrait of a wise old wizard',
      user_id: testUser.id
    };

    const result = await generateImage(input);

    expect(result.prompt).toEqual(input.prompt);
    expect(result.user_id).toEqual(testUser.id);
    
    // Verify the association in the database
    const dbRecord = await db.select()
      .from(imageGenerationsTable)
      .where(eq(imageGenerationsTable.id, result.id))
      .execute();

    expect(dbRecord[0].user_id).toEqual(testUser.id);
    expect(dbRecord[0].prompt).toEqual(input.prompt);
  });
});