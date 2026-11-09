// Göçleri uygular. Uygulama açılışında da çağrılır; ayrı komut olarak da çalışır.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { db, veritabaniBaglan, veritabaniTuru, veritabaniKapat } from './index.js';
import { logger } from '../lib/logger.js';

const klasor = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../drizzle');

export async function gocleriUygula() {
  await veritabaniBaglan();
  // pgvector eklentisi tablolardan önce kurulmalı; drizzle-kit eklentileri yönetmez.
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
  const { migrate } =
    veritabaniTuru === 'pglite'
      ? await import('drizzle-orm/pglite/migrator')
      : await import('drizzle-orm/node-postgres/migrator');
  await migrate(db, { migrationsFolder: klasor });
  logger.info('Göçler uygulandı');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await gocleriUygula();
  await veritabaniKapat();
}
