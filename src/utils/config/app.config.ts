import { registerAs } from '@nestjs/config';
import { Env, envSchema } from './env.schema';

const appConfig = registerAs('app', () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(result.error.toString());
  }

  const env = result.data;

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
  };
});

export default appConfig;

export type AppConfigType = { app: ReturnType<typeof appConfig> };
