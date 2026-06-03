export const config = {
  port: parseInt(process.env.PORT || '5847', 10),
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev_only_change_me'),
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:6347,http://127.0.0.1:6347')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET is required in production');
}
