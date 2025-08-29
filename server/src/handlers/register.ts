import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput, type AuthResponse } from '../schema';
import { eq, or } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

export async function register(input: RegisterInput): Promise<AuthResponse> {
  try {
    // Check if email or username already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.email, input.email),
          eq(usersTable.username, input.username)
        )
      )
      .execute();

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.email === input.email) {
        throw new Error('Email already exists');
      }
      if (existingUser.username === input.username) {
        throw new Error('Username already exists');
      }
    }

    // Hash the password using crypto
    const salt = Math.random().toString(36).slice(2);
    const password_hash = createHash('sha256').update(input.password + salt).digest('hex') + ':' + salt;

    // Create the user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        username: input.username,
        password_hash: password_hash
      })
      .returning()
      .execute();

    const user = result[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env['JWT_SECRET'] || 'fallback_secret',
      { expiresIn: '7d' }
    );

    // Return user data (without password) and token
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at
      },
      token
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}