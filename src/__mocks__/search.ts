import { getRandomFile } from './file';
import { SearchItemType } from '../common/constants';
import { faker } from '@faker-js/faker';

function uniqueById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export const createMockSearches = () => {
  return faker.helpers.shuffle([
    // Users with faker-generated data
    ...Array.from({ length: 12 }, () => ({
      id: faker.string.uuid(),
      type: SearchItemType.USER as const,
      email: faker.internet.email(),
      username: faker.internet.username(),
      displayName: faker.person.fullName(),
      avatar: getRandomFile(faker.string.uuid()),
    })),

    // Hashtags using various faker categories as IDs
    ...uniqueById(
      Array.from({ length: 5 }, () => ({
        id: faker.helpers.arrayElement([
          faker.food.meat(),
          faker.music.genre(),
          faker.food.fruit(),
          faker.animal.type(),
          faker.color.human(),
          faker.vehicle.type(),
          faker.food.dish(),
          faker.science.chemicalElement().name.toLowerCase(),
          faker.commerce.department(),
          faker.hacker.noun(),
          faker.food.vegetable(),
          faker.food.spice(),
        ]),
        type: SearchItemType.HASHTAG as const,
        count: faker.number.int({ min: 10000, max: 1000000 }),
      }))
    ),

    // Query searches using meaningful search terms
    ...Array.from({ length: 3 }, () => ({
      type: SearchItemType.QUERY as const,
      id: faker.helpers
        .arrayElement([
          faker.music.genre(),
          faker.food.meat(),
          faker.science.chemicalElement().name,
          faker.commerce.productName(),
          faker.animal.type(),
          faker.food.fruit(),
          faker.vehicle.manufacturer(),
          faker.color.human(),
          faker.hacker.noun(),
          faker.food.dish(),
        ])
        .toLowerCase(),
    })),
  ]);
};
