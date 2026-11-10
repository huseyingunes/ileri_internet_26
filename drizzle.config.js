// drizzle-kit: şemadaki değişikliklerden SQL göç (migration) dosyası üretir.
//   npm run db:generate  → drizzle/ klasörüne yeni göç yazar
//   npm run db:migrate   → bekleyen göçleri sırayla uygular
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.js',
  out: './drizzle',
});
