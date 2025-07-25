import type { UserPayload, HashtagPayload } from 'api';
import { getRandomFile } from './file';
import { faker } from '@faker-js/faker';

export const mockSuggestedUsers: UserPayload[] = Array.from({ length: 5 }, () => {
  const hasFollowedBy = faker.datatype.boolean();
  const followedByCount = faker.number.int({ min: 1, max: 150 });

  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    username: faker.helpers.arrayElement([
      faker.internet.username(),
      `${faker.food.meat().toLowerCase().replace(' ', '_')}_${faker.person.firstName().toLowerCase()}`,
      `${faker.color.human().toLowerCase()}_${faker.vehicle.type().toLowerCase().replace(' ', '_')}`,
      `${faker.food.spice().toLowerCase().replace(' ', '_')}_${faker.hacker.noun()}`,
      `${faker.music.genre().toLowerCase().replace(' ', '_')}_${faker.person.firstName().toLowerCase()}`,
      `${faker.animal.type().toLowerCase().replace(' ', '_')}_${faker.person.firstName().toLowerCase()}`,
      `${faker.hacker.noun()}_${faker.person.firstName().toLowerCase()}`,
      `${faker.food.fruit().toLowerCase()}_${faker.number.int({ min: 1000, max: 9999 })}`,
    ]),
    displayName: faker.helpers.arrayElement([
      faker.person.fullName(),
      `${faker.person.firstName()} | ${faker.food.dish()}`,
    ]),
    avatar: getRandomFile(faker.string.uuid()),
    bio: faker.helpers.maybe(
      () =>
        faker.helpers.arrayElement([
          `${faker.person.jobTitle()} | ${faker.company.buzzPhrase()} | ${faker.hacker.phrase()}`,
          `${faker.music.genre()} enthusiast | ${faker.food.dish()} lover | ${faker.animal.type()} whisperer`,
          `${faker.commerce.department()} specialist | ${faker.food.fruit()} addict | Always ${faker.hacker.ingverb()}`,
          `${faker.person.jobTitle()} | ${faker.food.vegetable()} coach | ${faker.science.unit().name} advocate`,
          `Digital ${faker.commerce.productAdjective()} | ${faker.food.dish()} creator | ${faker.hacker.adjective()}`,
          `${faker.music.genre()} producer | ${faker.food.meat()} specialist | Creating ${faker.color.human().toLowerCase()} vibes`,
          `${faker.person.jobTitle()} | ${faker.food.spice()} enthusiast | ${faker.hacker.phrase()}`,
        ]),
      { probability: 0.8 }
    ),
    followers: faker.number.int({ min: 10000, max: 300000 }),
    following: faker.number.int({ min: 500, max: 150000 }),
    isFollowing: faker.datatype.boolean(),
    hasFeed: faker.datatype.boolean(),
    ...(hasFollowedBy && {
      followedBy: {
        displayItems: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
          id: faker.string.uuid(),
          displayName: faker.person.fullName(),
          avatar: getRandomFile(faker.string.uuid()),
        })),
        count: followedByCount,
      },
    }),
  };
});

export const mockTrendingTopics: HashtagPayload[] = Array.from({ length: 5 }, () => ({
  id: faker.helpers.arrayElement([
    faker.food.meat(),
    faker.music.genre(),
    faker.hacker.noun(),
    faker.food.fruit(),
    faker.color.human(),
    faker.vehicle.type(),
    faker.science.chemicalElement().name.toLowerCase(),
    faker.food.dish(),
  ]),
  count: faker.number.int({ min: 500000, max: 2000000 }),
}));
