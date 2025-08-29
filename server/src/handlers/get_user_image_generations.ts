import { db } from '../db';
import { imageGenerationsTable } from '../db/schema';
import { type GetUserImageGenerationsInput, type ImageGeneration } from '../schema';
import { eq, desc, and, type SQL } from 'drizzle-orm';

export async function getUserImageGenerations(input: GetUserImageGenerationsInput): Promise<ImageGeneration[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id
    conditions.push(eq(imageGenerationsTable.user_id, input.user_id));

    // Add status filter if provided
    if (input.status) {
      conditions.push(eq(imageGenerationsTable.status, input.status));
    }

    // Apply pagination with defaults
    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;

    // Build complete query in one chain to avoid type issues
    const results = await db.select()
      .from(imageGenerationsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(imageGenerationsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    // Return results (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to get user image generations:', error);
    throw error;
  }
}