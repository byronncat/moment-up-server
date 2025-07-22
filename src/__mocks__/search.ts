import { getRandomFile } from './file';
import { SearchType } from '../common/constants';

export const mockSearches = [
  {
    id: '45d49f7d-d07f-4eae-abcf-2f61ced287a2',
    type: SearchType.USER,
    username: 'mbontoft0',
    displayName: 'Mac Bontoft',
    avatar: getRandomFile('45d49f7d-d07f-4eae-abcf-2f61ced287a2'),
  },
  {
    id: 'hello',
    type: SearchType.HASHTAG,
    count: 100,
  },
  {
    type: SearchType.SEARCH,
    id: 'general',
  },
  {
    id: '7b0bf82a-0407-4fa4-9fdf-106a681a626c',
    type: SearchType.USER,
    username: 'ssauven1',
    displayName: 'Stanislaw Sauven',
    avatar: getRandomFile('7b0bf82a-0407-4fa4-9fdf-106a681a626c'),
  },
  {
    id: 'e0e16793-c56f-4456-80d9-9767d5e3c3da',
    type: SearchType.USER,
    username: 'ahaccleton2',
    displayName: 'Aurie Haccleton',
    avatar: getRandomFile('e0e16793-c56f-4456-80d9-9767d5e3c3da'),
  },
  {
    id: 'software',
    type: SearchType.SEARCH,
  },
  {
    id: '261c65cb-4646-47ba-a65a-262d7242ee9f',
    type: SearchType.USER,
    username: 'droderham3',
    displayName: 'Dannie Roderham',
    avatar: getRandomFile('261c65cb-4646-47ba-a65a-262d7242ee9f'),
  },
  {
    id: '4bef2e89-8dc0-4dd4-8b82-219b13d4ae0d',
    type: SearchType.USER,
    username: 'tronald4',
    displayName: 'Timmie Ronald',
    avatar: getRandomFile('4bef2e89-8dc0-4dd4-8b82-219b13d4ae0d'),
  },
  {
    id: 'education',
    type: SearchType.SEARCH,
  },
  {
    id: '60edd744-11e7-497f-9077-491a49369b18',
    type: SearchType.USER,
    username: 'hhartley5',
    displayName: 'Hyacinthe Hartley',
    avatar: getRandomFile('60edd744-11e7-497f-9077-491a49369b18'),
  },
  {
    type: SearchType.HASHTAG,
    id: 'faucibus',
    count: 967001,
  },
  {
    type: SearchType.HASHTAG,
    id: 'maecenas',
    count: 773000,
  },
  {
    id: '382d48f6-a932-410b-8309-ff0b9b6024e4',
    type: SearchType.USER,
    username: 'vblacklock6',
    displayName: 'Virginie Blacklock',
    avatar: getRandomFile('382d48f6-a932-410b-8309-ff0b9b6024e4'),
  },
  {
    id: '766e49e6-46b7-4104-bfa1-aed763262d57',
    type: SearchType.USER,
    username: 'jsevern7',
    displayName: 'Justin Severn',
    avatar: getRandomFile('766e49e6-46b7-4104-bfa1-aed763262d57'),
  },
  {
    id: '41e5323f-0ce9-4d37-a8db-46d4ca0a8809',
    type: SearchType.USER,
    username: 'bakers8',
    displayName: 'Berry Akers',
    avatar: getRandomFile('41e5323f-0ce9-4d37-a8db-46d4ca0a8809'),
  },
  {
    id: 'a2f41718-2ddb-4c03-bdda-f80c5373cd96',
    type: SearchType.USER,
    username: 'smcwilliam9',
    displayName: 'Spense McWilliam',
    avatar: getRandomFile('a2f41718-2ddb-4c03-bdda-f80c5373cd96'),
  },
  {
    type: SearchType.HASHTAG,
    id: 'purus',
    count: 502053,
  },
  {
    type: SearchType.HASHTAG,
    id: 'bibendum',
    count: 999040,
  },
  {
    type: SearchType.HASHTAG,
    id: 'morbi',
    count: 580656,
  },
  {
    id: '6934603c-5bd1-40c5-a298-3d0cde2de578',
    type: SearchType.USER,
    username: 'bsantea',
    displayName: 'Bernetta Sante',
    avatar: getRandomFile('6934603c-5bd1-40c5-a298-3d0cde2de578'),
  },
  {
    id: 'c6ad53bf-1252-4911-bef7-a9bb13f26aed',
    type: SearchType.USER,
    username: 'mpackingtonb',
    displayName: 'Morse Packington',
    avatar: getRandomFile('c6ad53bf-1252-4911-bef7-a9bb13f26aed'),
  },
  {
    type: SearchType.HASHTAG,
    id: 'diam',
    count: 785210,
  },
  {
    type: SearchType.HASHTAG,
    id: 'nascetur',
    count: 771306,
  },
  {
    type: SearchType.HASHTAG,
    id: 'vestibulum',
    count: 560842,
  },
  {
    type: SearchType.HASHTAG,
    id: 'amet',
    count: 262813,
  },
  {
    type: SearchType.HASHTAG,
    id: 'nec',
    count: 576860,
  },
  {
    type: SearchType.HASHTAG,
    id: 'ultrices',
    count: 698670,
  },
  {
    type: SearchType.HASHTAG,
    id: 'vel',
    count: 797545,
  },
];
