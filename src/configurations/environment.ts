import * as Joi from 'joi';
import { Format } from 'src/common/utilities';

export const load = () => ({
  nodeEnv: process.env.NODE_ENV,
  app: {
    baseUrl: Format.origin(process.env.BASE_URL),
  },
  http: {
    port: process.env.PORT,
    prefix: process.env.PREFIX,
    allowedOrigin: Format.origin(process.env.ALLOWED_ORIGIN),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET,
    sessionSecret: process.env.SESSION_SECRET,
    csrfSecret: process.env.CSRF_SECRET,
    hashSaltRounds: parseInt(process.env.HASH_SALT_ROUNDS || '10'),
  },
  db: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    redisUsername: process.env.REDIS_USERNAME,
    redisPassword: process.env.REDIS_PASSWORD,
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT,
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE,
    username: process.env.EMAIL_USERNAME,
    password: process.env.EMAIL_PASSWORD,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
});

export const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  BASE_URL: Joi.string().uri().default('http://localhost:4000'),
  PORT: Joi.number().default(4000),
  PREFIX: Joi.string().default(''),
  ALLOWED_ORIGIN: Joi.string().uri().default('http://localhost:3000'),
  JWT_SECRET: Joi.string().required(),
  SESSION_SECRET: Joi.string().required(),
  CSRF_SECRET: Joi.string().required(),
  HASH_SALT_ROUNDS: Joi.number().integer().default(10),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_KEY: Joi.string().required(),
  REDIS_USERNAME: Joi.string().required(),
  REDIS_PASSWORD: Joi.string().required(),
  REDIS_HOST: Joi.string().hostname().required(),
  REDIS_PORT: Joi.number().port().required(),
  EMAIL_HOST: Joi.string().required(),
  EMAIL_PORT: Joi.number().required(),
  EMAIL_SECURE: Joi.boolean().required(),
  EMAIL_USERNAME: Joi.string().required(),
  EMAIL_PASSWORD: Joi.string().required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
});
