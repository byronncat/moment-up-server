export const environment = () => ({
  nodeEnv: process.env.NODE_ENV,
  http: {
    port: process.env.PORT,
    prefix: process.env.PREFIX,
    allowedOrigin: process.env.ALLOWED_ORIGIN,
  },
  security: {
    sessionSecret: process.env.SESSION_SECRET,
    hashSaltRounds: process.env.HASH_SALT_ROUNDS,
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
