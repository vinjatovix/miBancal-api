import dotenv from 'dotenv';

export const loadEnvFile = (): void => {
  dotenv.config({
    path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    override: true,
    quiet: true
  });
};
