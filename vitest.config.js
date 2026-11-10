import { defineConfig } from 'vitest/config';

// Testler varsayılan olarak bellekteki PGlite ile çalışır: kurulum gerekmez, her dosya temiz veritabanı alır.
// CI'da TEST_DATABASE_URL / TEST_REDIS_URL verilirse gerçek PostgreSQL ve Redis kullanılır.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'pglite:memory://',
      REDIS_URL: process.env.TEST_REDIS_URL || '',
      AMQP_URL: '',
      ELASTIC_URL: '',
      LLM_BASE_URL: '',
      LLM_API_KEY: '',
      GITHUB_CLIENT_ID: '',
      METRIK_PAROLA: '',
    },
    fileParallelism: false, // ortak PostgreSQL kullanılırsa dosyalar birbirini bozmasın
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
