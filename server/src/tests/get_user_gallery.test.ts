import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, imageGenerationsTable, galleryImagesTable } from '../db/schema';
import { type GetUserGalleryInput } from '../schema';
import { getUserGallery } from '../handlers/get_user_gallery';

// Test users data
const testUsers = [
  {
    email: 'user1@example.com',
    password_hash: 'hashed_password_1',
    username: 'user1'
  },
  {
    email: 'user2@example.com', 
    password_hash: 'hashed_password_2',
    username: 'user2'
  }
];

// Test image generations data
const testImageGenerations = [
  {
    user_id: 1,
    prompt: 'A beautiful sunset',
    image_url: 'https://example.com/sunset.jpg',
    image_filename: 'sunset.jpg',
    status: 'completed' as const
  },
  {
    user_id: 1,
    prompt: 'A mountain landscape',
    image_url: 'https://example.com/mountain.jpg',
    image_filename: 'mountain.jpg',
    status: 'completed' as const
  },
  {
    user_id: 2,
    prompt: 'A city skyline',
    image_url: 'https://example.com/city.jpg',
    image_filename: 'city.jpg',
    status: 'completed' as const
  }
];

// Test gallery images data
const testGalleryImages = [
  {
    user_id: 1,
    image_generation_id: 1,
    title: 'My Beautiful Sunset',
    is_public: true
  },
  {
    user_id: 1,
    image_generation_id: 2,
    title: 'Mountain View',
    is_public: false
  },
  {
    user_id: 2,
    image_generation_id: 3,
    title: 'City at Night',
    is_public: true
  }
];

describe('getUserGallery', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test users
    await db.insert(usersTable).values(testUsers).execute();
    
    // Create test image generations
    await db.insert(imageGenerationsTable).values(testImageGenerations).execute();
    
    // Create test gallery images
    await db.insert(galleryImagesTable).values(testGalleryImages).execute();
  });

  afterEach(resetDB);

  it('should fetch user gallery images', async () => {
    const input: GetUserGalleryInput = {
      user_id: 1
    };

    const result = await getUserGallery(input);

    expect(result).toHaveLength(2);
    
    // Check that both images belong to user 1
    result.forEach(image => {
      expect(image.user_id).toEqual(1);
      expect(image.id).toBeDefined();
      expect(image.created_at).toBeInstanceOf(Date);
    });

    // Check that we have both expected titles (order may vary)
    const titles = result.map(img => img.title);
    expect(titles).toContain('Mountain View');
    expect(titles).toContain('My Beautiful Sunset');

    // Check that we have both expected generation IDs
    const generationIds = result.map(img => img.image_generation_id);
    expect(generationIds).toContain(1);
    expect(generationIds).toContain(2);
  });

  it('should return empty array for user with no gallery images', async () => {
    // Create a user with no gallery images
    await db.insert(usersTable).values({
      email: 'empty@example.com',
      password_hash: 'hashed',
      username: 'emptyuser'
    }).execute();

    const input: GetUserGalleryInput = {
      user_id: 4 // This user has no gallery images
    };

    const result = await getUserGallery(input);

    expect(result).toHaveLength(0);
  });

  it('should apply limit parameter correctly', async () => {
    const input: GetUserGalleryInput = {
      user_id: 1,
      limit: 1
    };

    const result = await getUserGallery(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(1);
    // Should get one of the user's gallery images
    const titles = ['Mountain View', 'My Beautiful Sunset'];
    expect(titles).toContain(result[0].title);
  });

  it('should apply offset parameter correctly', async () => {
    const input: GetUserGalleryInput = {
      user_id: 1,
      offset: 1
    };

    const result = await getUserGallery(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(1);
    // Should get one of the user's gallery images (with offset applied)
    const titles = ['Mountain View', 'My Beautiful Sunset'];
    expect(titles).toContain(result[0].title);
  });

  it('should apply both limit and offset parameters', async () => {
    // Add more gallery images to test pagination better
    const additionalImageGenerations = [
      {
        user_id: 1,
        prompt: 'Another image',
        image_url: 'https://example.com/another.jpg',
        image_filename: 'another.jpg',
        status: 'completed' as const
      },
      {
        user_id: 1,
        prompt: 'Fourth image',
        image_url: 'https://example.com/fourth.jpg',
        image_filename: 'fourth.jpg',
        status: 'completed' as const
      }
    ];

    await db.insert(imageGenerationsTable).values(additionalImageGenerations).execute();

    const additionalGalleryImages = [
      {
        user_id: 1,
        image_generation_id: 4,
        title: 'Third Image',
        is_public: false
      },
      {
        user_id: 1,
        image_generation_id: 5,
        title: 'Fourth Image',
        is_public: true
      }
    ];

    await db.insert(galleryImagesTable).values(additionalGalleryImages).execute();

    const input: GetUserGalleryInput = {
      user_id: 1,
      limit: 2,
      offset: 1
    };

    const result = await getUserGallery(input);

    expect(result).toHaveLength(2);
    // Should get 2 images for user 1
    result.forEach(image => {
      expect(image.user_id).toEqual(1);
    });
    
    // Check that we have images (specific order depends on timing)
    const titles = result.map(img => img.title);
    expect(titles.length).toEqual(2);
  });

  it('should only return images for the specified user', async () => {
    const input: GetUserGalleryInput = {
      user_id: 2
    };

    const result = await getUserGallery(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(2);
    expect(result[0].title).toEqual('City at Night');
    
    // Verify no images from other users are returned
    result.forEach(image => {
      expect(image.user_id).toEqual(2);
    });
  });

  it('should order results by created_at descending', async () => {
    const input: GetUserGalleryInput = {
      user_id: 1
    };

    const result = await getUserGallery(input);

    expect(result).toHaveLength(2);
    
    // Check that dates are in descending order (most recent first)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at.getTime()).toBeGreaterThanOrEqual(
        result[i + 1].created_at.getTime()
      );
    }

    // All results should be for user 1
    result.forEach(image => {
      expect(image.user_id).toEqual(1);
      expect(image.created_at).toBeInstanceOf(Date);
    });
  });

  it('should handle non-existent user gracefully', async () => {
    const input: GetUserGalleryInput = {
      user_id: 999 // Non-existent user
    };

    const result = await getUserGallery(input);

    expect(result).toHaveLength(0);
  });
});