import type { Post, User } from 'schema';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { CloudinaryService } from '../database/cloudinary.service';
import { getRandomFile, imageUrls } from 'src/__mocks__/file';
import { faker } from '@faker-js/faker';
import { ContentPrivacy, ProfileVisibility } from 'src/common/constants';
import { Auth } from 'src/common/helpers';
import { UserService } from '../user/user.service';

const DEFAULT_PASSWORD = '1';

@Injectable()
export class DevelopmentService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly userService: UserService
  ) {}

  public async changePassword(id: string, newPassword: string) {
    const user = await this.userService.updatePassword(id, newPassword);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  public async verifyEmail(id: string) {
    const user = await this.userService.verifyEmail(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  public async generateUsers(count = 10) {
    if (count <= 0) {
      throw new BadRequestException('Count must be greater than 0');
    }

    if (count > 100) {
      throw new BadRequestException('Count cannot exceed 100 users at once');
    }

    const usersToInsert: Array<Omit<User, 'id' | 'created_at' | 'last_modified'>> = [];

    const remainingCount = count - usersToInsert.length;
    if (remainingCount > 0) {
      for (let i = 0; i < remainingCount; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const username = faker.internet.username({ firstName, lastName }).toLowerCase();
        const email = faker.internet.email({ firstName, lastName }).toLowerCase();

        const existingUser = await this.supabaseService.select<User>('users', {
          orWhere: { username, email },
          select: 'id',
        });

        const privateRatio = 0.2;

        if (existingUser.length === 0) {
          usersToInsert.push({
            username,
            display_name: `${firstName} ${lastName}`,
            email,
            password: await Auth.hash(DEFAULT_PASSWORD, 12),
            avatar: getRandomFile(faker.string.uuid()),
            background_image: faker.datatype.boolean(0.7)
              ? getRandomFile(faker.string.uuid(), '1.91:1')
              : null,
            bio: faker.datatype.boolean(0.6) ? faker.lorem.sentence() : null,
            verified: true,
            blocked: false,
            privacy: faker.datatype.boolean(privateRatio)
              ? ProfileVisibility.PRIVATE
              : ProfileVisibility.PUBLIC,
            deleted_at: null,
          });
        }
      }
    }

    if (usersToInsert.length === 0) {
      return {
        message: 'No new users to insert. All requested users already exist.',
        insertedCount: 0,
        users: [],
      };
    }

    try {
      const insertedUsers = await this.supabaseService.insert<User>('users', usersToInsert);

      return {
        message: `Successfully inserted ${insertedUsers.length} users`,
        insertedCount: insertedUsers.length,
        users: insertedUsers.map((user) => ({
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          email: user.email,
          verified: user.verified,
          blocked: user.blocked,
          privacy: user.privacy,
        })),
      };
    } catch {
      throw new BadRequestException('Failed to insert users into database');
    }
  }

  public async generateFollowRelationships(maxFollowsPerUser = 5) {
    if (maxFollowsPerUser <= 0) {
      throw new BadRequestException('maxFollowsPerUser must be greater than 0');
    }

    if (maxFollowsPerUser > 50) {
      throw new BadRequestException('maxFollowsPerUser cannot exceed 50');
    }

    try {
      // Get all users from the database
      const users = await this.supabaseService.select<User>('users', {
        select: 'id, username, display_name',
        where: { blocked: false },
      });

      if (users.length < 2) {
        return {
          message: 'Need at least 2 users to create follow relationships',
          relationshipsCreated: 0,
          relationships: [],
        };
      }

      const relationshipsToInsert: Array<{ follower_id: string; following_id: string }> = [];
      const existingRelationships = new Set<string>();

      // Get existing follow relationships to avoid duplicates
      const existingFollows = await this.supabaseService.select<{
        follower_id: string;
        following_id: string;
      }>('follows', {
        select: 'follower_id, following_id',
      });

      existingFollows.forEach((follow) => {
        existingRelationships.add(`${follow.follower_id}-${follow.following_id}`);
      });

      // Generate follow relationships
      for (const user of users) {
        const followCount = faker.number.int({ min: 1, max: maxFollowsPerUser });
        const potentialFollows = users.filter((u) => u.id !== user.id);

        // Shuffle and take random users to follow
        const shuffledFollows = faker.helpers.shuffle(potentialFollows);
        const usersToFollow = shuffledFollows.slice(0, followCount);

        for (const userToFollow of usersToFollow) {
          const relationshipKey = `${user.id}-${userToFollow.id}`;

          if (!existingRelationships.has(relationshipKey)) {
            relationshipsToInsert.push({
              follower_id: user.id,
              following_id: userToFollow.id,
            });
            existingRelationships.add(relationshipKey);
          }
        }
      }

      if (relationshipsToInsert.length === 0) {
        return {
          message:
            'No new follow relationships to create. All possible relationships already exist.',
          relationshipsCreated: 0,
          relationships: [],
        };
      }

      // Insert the follow relationships
      const insertedRelationships = await this.supabaseService.insert<{
        follower_id: string;
        following_id: string;
      }>('follows', relationshipsToInsert);

      return {
        message: `Successfully created ${insertedRelationships.length} follow relationships`,
        relationshipsCreated: insertedRelationships.length,
        relationships: insertedRelationships.map((rel) => {
          const follower = users.find((u) => u.id === rel.follower_id);
          const following = users.find((u) => u.id === rel.following_id);
          return {
            follower_id: rel.follower_id,
            following_id: rel.following_id,
            follower_username: follower?.username,
            following_username: following?.username,
          };
        }),
      };
    } catch {
      throw new BadRequestException('Failed to create follow relationships');
    }
  }

  public async generatePosts() {
    try {
      // Get all existing users from the database
      const users = await this.supabaseService.select<User>('users', {
        select: 'id, username, display_name',
        where: { blocked: false },
      });

      if (users.length === 0) {
        return {
          message: 'No users found in database. Please create users first.',
          insertedCount: 0,
          posts: [],
        };
      }

      // Only use image files (no videos)
      const allImages = [...imageUrls].sort(() => Math.random() - 0.5);
      const postsToInsert: Array<Omit<Post, 'id' | 'created_at' | 'last_modified'>> = [];

      let imageIndex = 0;
      const totalImages = allImages.length;

      // Helper function to generate text content
      const generateTextContent = () => {
        const hasHashtag = faker.datatype.boolean({ probability: 0.4 });
        const hasMultipleParagraphs = faker.datatype.boolean({ probability: 0.3 });

        let text = '';

        if (hasMultipleParagraphs) {
          const paragraphCount = faker.number.int({ min: 2, max: 4 });
          text = Array.from({ length: paragraphCount }, () => faker.lorem.paragraph()).join('\n\n');
        } else {
          text = faker.helpers.arrayElement([
            faker.lorem.sentence(),
            faker.lorem.paragraph(),
            `${faker.hacker.phrase()}! 🔥`,
            `Just ${faker.hacker.ingverb()} with ${faker.food.dish().toLowerCase()}`,
            faker.company.buzzPhrase(),
          ]);
        }

        if (hasHashtag) {
          const hashtags = Array.from(
            { length: faker.number.int({ min: 1, max: 3 }) },
            () =>
              `#${faker.helpers
                .arrayElement([
                  faker.food.meat(),
                  faker.music.genre(),
                  faker.color.human(),
                  faker.vehicle.type(),
                  faker.word.adjective(),
                  faker.word.noun(),
                ])
                .toLowerCase()
                .replace(/\s+/g, '')}`
          ).join(' ');
          text = `${text} ${hashtags}`;
        }

        return text;
      };

      // Generate posts for each user, cycling through users until all images are used
      let userIndex = 0;
      while (imageIndex < totalImages) {
        const user = users[userIndex % users.length];

        // Determine post type: 0.4 text only, 0.2 image only, 0.4 text & image
        const rand = Math.random();
        let postType: 'text' | 'image' | 'both';

        if (rand < 0.4) {
          postType = 'text';
        } else if (rand < 0.6) {
          postType = 'image';
        } else {
          postType = 'both';
        }

        let text: string | null = null;
        let attachments: Array<{ id: string; type: 'image' | 'video' }> | null = null;

        // Generate text for text-only and both types
        if (postType === 'text' || postType === 'both') {
          text = generateTextContent();
        }

        // Generate images for image-only and both types
        if (postType === 'image' || postType === 'both') {
          const imagesPerPost = faker.number.int({ min: 1, max: 12 });
          const imageFilesForPost = [];

          for (let j = 0; j < imagesPerPost && imageIndex < totalImages; j++) {
            const image = allImages[imageIndex];
            imageFilesForPost.push({
              id: image.url,
              type: 'image' as const,
            });
            imageIndex++;
          }

          if (imageFilesForPost.length > 0) {
            attachments = imageFilesForPost;
          }
        }

        const postData: Omit<Post, 'id' | 'created_at' | 'last_modified'> = {
          user_id: user.id,
          text,
          attachments,
          privacy: (() => {
            const rand = Math.random();
            if (rand < 0.15) {
              return ContentPrivacy.PRIVATE;
            } else if (rand < 0.4) {
              return ContentPrivacy.FOLLOWERS;
            } else {
              return ContentPrivacy.PUBLIC;
            }
          })(),
        };

        postsToInsert.push(postData);
        userIndex++;
      }

      if (postsToInsert.length === 0) {
        return {
          message: 'No posts were generated',
          insertedCount: 0,
          posts: [],
        };
      }

      // Insert all posts
      const insertedPosts = await this.supabaseService.insert<Post>('posts', postsToInsert);

      return {
        message: `Successfully created ${insertedPosts.length} posts using ${imageIndex} images`,
        insertedCount: insertedPosts.length,
        imagesUsed: imageIndex,
        posts: insertedPosts.map((post) => ({
          id: post.id,
          user_id: post.user_id,
          text: post.text,
          attachments: post.attachments,
          privacy: post.privacy,
          created_at: post.created_at,
        })),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate posts: ${error.message}`);
    }
  }

  public async getMediaInfo(mediaId?: string, ids?: string, format?: 'image' | 'video' | 'raw') {
    if (ids) {
      const media = await this.cloudinaryService.getResources(ids.split(','), format);
      return media;
    }

    if (mediaId) {
      const media = await this.cloudinaryService.getResource(mediaId, format);
      if (!media) throw new NotFoundException('Media not found');
      return media;
    }

    return null;
  }
}
