// Veritabanı bağlantısı. DATABASE_URL tanımlıysa gerçek PostgreSQL (node-postgres havuzu),
// değilse gömülü PGlite kullanılır. İki durumda da aynı Drizzle API'si — kod değişmez.
import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdirSync } from 'node:fs';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import * as schema from './schema.js';

// İstek başına sorgu sayacı: N+1 sorununu görünür kılmak için.
export const sorguBaglami = new AsyncLocalStorage();

const sayacLogger = {
  logQuery(sorgu) {
    const baglam = sorguBaglami.getStore();
    if (baglam) {
      baglam.sorgular += 1;
      if (baglam.kaydet) baglam.liste.push(sorgu);
    }
  },
};

export let db;
export let veritabaniTuru;
let kapatici = async () => {};

export async function veritabaniBaglan(url = config.DATABASE_URL) {
  if (db) return db;

  if (url && !url.startsWith('pglite:')) {
    const { default: pg } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const havuz = new pg.Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000 });
    havuz.on('error', (err) => logger.error({ err }, 'PostgreSQL havuz hatası'));
    db = drizzle(havuz, { schema, logger: sayacLogger });
    veritabaniTuru = 'postgresql';
    kapatici = () => havuz.end();
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const { vector } = await import('@electric-sql/pglite-pgvector');
    const { drizzle } = await import('drizzle-orm/pglite');
    const dizin = url?.startsWith('pglite:') ? url.slice(7) : config.PGLITE_DIR;
    if (dizin !== 'memory://') mkdirSync(dizin, { recursive: true });
    const istemci = new PGlite(dizin, { extensions: { vector } });
    await istemci.waitReady;
    db = drizzle(istemci, { schema, logger: sayacLogger });
    veritabaniTuru = 'pglite';
    kapatici = () => istemci.close();
  }
  logger.info({ tur: veritabaniTuru }, 'Veritabanına bağlanıldı');
  return db;
}

export async function veritabaniKapat() {
  await kapatici();
  db = undefined;
}

export { schema };
