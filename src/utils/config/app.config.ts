import { registerAs } from '@nestjs/config';
import { envSchema } from './env.schema.js';

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
    otpExpiredTime: env.OTP_EXPIRED_TIME_KEY,
    otpRetryTime: env.OTP_RETRY_TIME,
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessExpiresIn: env.JWT_ACCESS_TOKEN_EXPIRATION,
      refreshExpiresIn: env.JWT_REFRESH_TOKEN_EXPIRATION,
      monitoringAccessSecret: env.JWT_MONITORING_ACCESS_SECRET,
      monitoringAccessExpiresIn: env.JWT_MONITORING_ACCESS_TOKEN_EXPIRATION,
    },
  };
});

export default appConfig;

export type AppConfigType = { app: ReturnType<typeof appConfig> };
