import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../schema';
import { register } from '../handlers/register';
import { eq } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

// Test input data
const testInput: RegisterInput = {
  email: 'test@example.com',
  password: 'password123',
  username: 'testuser'
};

describe('register', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user successfully', async () => {
    const result = await register(testInput);

    // Validate response structure
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
    
    // Validate user data
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.username).toEqual('testuser');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    
    // Validate token is a non-empty string
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
    
    // Verify password_hash is not included in response
    expect((result.user as any).password_hash).toBeUndefined();
  });

  it('should save user to database with hashed password', async () => {
    const result = await register(testInput);

    // Query the database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    const user = users[0];
    
    expect(user.email).toEqual('test@example.com');
    expect(user.username).toEqual('testuser');
    expect(user.created_at).toBeInstanceOf(Date);
    
    // Verify password is hashed (not plain text)
    expect(user.password_hash).not.toEqual('password123');
    expect(user.password_hash.length).toBeGreaterThan(20); // Hashes are long
    expect(user.password_hash).toContain(':'); // Contains salt separator
    
    // Verify the hash is valid by reconstructing it
    const [hash, salt] = user.password_hash.split(':');
    const expectedHash = createHash('sha256').update('password123' + salt).digest('hex');
    expect(hash).toEqual(expectedHash);
  });

  it('should generate valid JWT token', async () => {
    const result = await register(testInput);

    // Verify token can be decoded
    const decoded = jwt.verify(
      result.token, 
      process.env['JWT_SECRET'] || 'fallback_secret'
    ) as any;

    expect(decoded.userId).toEqual(result.user.id);
    expect(decoded.email).toEqual('test@example.com');
    expect(decoded.exp).toBeDefined(); // Token should have expiration
  });

  it('should throw error if email already exists', async () => {
    // Register first user
    await register(testInput);

    // Try to register another user with same email
    const duplicateEmailInput: RegisterInput = {
      email: 'test@example.com', // Same email
      password: 'different123',
      username: 'differentuser' // Different username
    };

    await expect(register(duplicateEmailInput)).rejects.toThrow(/email already exists/i);
  });

  it('should throw error if username already exists', async () => {
    // Register first user
    await register(testInput);

    // Try to register another user with same username
    const duplicateUsernameInput: RegisterInput = {
      email: 'different@example.com', // Different email
      password: 'different123',
      username: 'testuser' // Same username
    };

    await expect(register(duplicateUsernameInput)).rejects.toThrow(/username already exists/i);
  });

  it('should handle different valid inputs', async () => {
    const differentInput: RegisterInput = {
      email: 'another@test.com',
      password: 'securepass456',
      username: 'anotheruser'
    };

    const result = await register(differentInput);

    expect(result.user.email).toEqual('another@test.com');
    expect(result.user.username).toEqual('anotheruser');
    expect(result.user.id).toBeDefined();
    expect(result.token).toBeDefined();
  });

  it('should create multiple users with unique data', async () => {
    // Register first user
    const result1 = await register(testInput);

    // Register second user with different data
    const secondInput: RegisterInput = {
      email: 'second@example.com',
      password: 'password456',
      username: 'seconduser'
    };
    const result2 = await register(secondInput);

    // Both should have different IDs
    expect(result1.user.id).not.toEqual(result2.user.id);
    
    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
    
    const emails = allUsers.map(u => u.email);
    expect(emails).toContain('test@example.com');
    expect(emails).toContain('second@example.com');
  });
});