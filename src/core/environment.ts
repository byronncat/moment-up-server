import * as Joi from 'joi';

export const load = () => ({
  nodeEnv: process.env.NODE_ENV,
  http: {
    port: process.env.PORT,
    prefix: process.env.PREFIX,
    allowedOrigin: process.env.ALLOWED_ORIGIN,
  },
  security: {
    jwtSecret: process.env.JWT_SECRET,
    sessionSecret: process.env.SESSION_SECRET,
    csrfSecret: process.env.CSRF_SECRET,
    hashSaltRounds: process.env.HASH_SALT_ROUNDS || 10,
  },
  db: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    redisUsername: process.env.REDIS_USERNAME,
    redisPassword: process.env.REDIS_PASSWORD,
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT,
  },
});

export const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  PREFIX: Joi.string().default(''),
  ALLOWED_ORIGIN: Joi.string().default('http://localhost:3000'),
  JWT_SECRET: Joi.string().required(),
  SESSION_SECRET: Joi.string().required(),
  CSRF_SECRET: Joi.string().required(),
  HASH_SALT_ROUNDS: Joi.number().default(10),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_KEY: Joi.string().required(),
  REDIS_USERNAME: Joi.string().required(),
  REDIS_PASSWORD: Joi.string().required(),
  REDIS_HOST: Joi.string().hostname().required(),
  REDIS_PORT: Joi.number().port().required(),
});
