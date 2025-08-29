import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Test user data
const testUserData = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'testpassword123'
};

const createTestUser = async () => {
  const passwordHash = await bcrypt.hash(testUserData.password, 10);
  
  const result = await db.insert(usersTable)
    .values({
      email: testUserData.email,
      username: testUserData.username,
      password_hash: passwordHash
    })
    .returning()
    .execute();

  return result[0];
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    // Create test user
    const testUser = await createTestUser();

    const loginInput: LoginInput = {
      email: testUserData.email,
      password: testUserData.password
    };

    const result = await login(loginInput);

    // Verify response structure
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');

    // Verify user data (password should be excluded)
    expect(result.user.id).toEqual(testUser.id);
    expect(result.user.email).toEqual(testUserData.email);
    expect(result.user.username).toEqual(testUserData.username);
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect((result.user as any).password_hash).toBeUndefined();

    // Verify JWT token is valid
    const jwtSecret = process.env['JWT_SECRET'] || 'default-secret-for-development';
    const decoded = jwt.verify(result.token, jwtSecret) as any;
    expect(decoded.userId).toEqual(testUser.id);
    expect(decoded.email).toEqual(testUserData.email);
    expect(decoded.exp).toBeDefined(); // Token should have expiration
  });

  it('should reject invalid email', async () => {
    // Create test user
    await createTestUser();

    const loginInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: testUserData.password
    };

    await expect(login(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject invalid password', async () => {
    // Create test user
    await createTestUser();

    const loginInput: LoginInput = {
      email: testUserData.email,
      password: 'wrongpassword'
    };

    await expect(login(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should handle empty password', async () => {
    // Create test user
    await createTestUser();

    const loginInput: LoginInput = {
      email: testUserData.email,
      password: ''
    };

    await expect(login(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should handle case-sensitive email', async () => {
    // Create test user with lowercase email
    await createTestUser();

    const loginInput: LoginInput = {
      email: 'TEST@EXAMPLE.COM', // Different case
      password: testUserData.password
    };

    // Should fail because email comparison is case-sensitive
    await expect(login(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should generate different tokens for multiple logins', async () => {
    // Create test user
    await createTestUser();

    const loginInput: LoginInput = {
      email: testUserData.email,
      password: testUserData.password
    };

    // Login twice
    const result1 = await login(loginInput);
    const result2 = await login(loginInput);

    // Tokens should be different (due to different issued-at times)
    expect(result1.token).not.toEqual(result2.token);

    // But both should be valid
    const jwtSecret = process.env['JWT_SECRET'] || 'default-secret-for-development';
    const decoded1 = jwt.verify(result1.token, jwtSecret) as any;
    const decoded2 = jwt.verify(result2.token, jwtSecret) as any;
    
    expect(decoded1.userId).toEqual(decoded2.userId);
    expect(decoded1.email).toEqual(decoded2.email);
  });

  it('should work with special characters in password', async () => {
    const specialPassword = 'p@ssw0rd!#$%^&*()';
    
    // Create user with special password
    const passwordHash = await bcrypt.hash(specialPassword, 10);
    await db.insert(usersTable)
      .values({
        email: 'special@example.com',
        username: 'specialuser',
        password_hash: passwordHash
      })
      .execute();

    const loginInput: LoginInput = {
      email: 'special@example.com',
      password: specialPassword
    };

    const result = await login(loginInput);

    expect(result.user.email).toEqual('special@example.com');
    expect(result.token).toBeDefined();
  });
});