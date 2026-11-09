// Ayrı arka plan işçisi: RabbitMQ'dan mesaj tüketir. API'den bağımsız ölçeklenir:
//   docker compose up --scale worker=3
// Ayrıca RSS_KAYNAKLARI tanımlıysa belirli aralıklarla haber kaynaklarını toplar.
import { logger } from './lib/logger.js';
import { config } from './config.js';
import { veritabaniBaglan, veritabaniKapat } from './db/index.js';
import { gocleriUygula } from './db/migrate.js';
import { onbellek, onbellekBaglan } from './onbellek/index.js';
import { kuyruk, kuyrukBaglan } from './kuyruk/index.js';
import { esIndeksHazirla } from './arama/index.js';
import { isleyicileriKaydet } from './isleyiciler/haberIsleyici.js';
import { rssTopla } from './rss/topla.js';

await veritabaniBaglan();
await gocleriUygula();
await onbellekBaglan();
await kuyrukBaglan();
await esIndeksHazirla().catch(() => {});
await isleyicileriKaydet(kuyruk);
logger.info({ kuyruk: kuyruk.tur }, 'Worker çalışıyor');

let zamanlayici;
if (config.RSS_KAYNAKLARI) {
  const calistir = () => rssTopla().catch((err) => logger.error({ err: err.message }, 'RSS toplama hatası'));
  calistir();
  zamanlayici = setInterval(calistir, 15 * 60_000);
}

async function kapat() {
  clearInterval(zamanlayici);
  await Promise.allSettled([kuyruk.kapat(), onbellek.kapat(), veritabaniKapat()]);
  process.exit(0);
}
process.on('SIGTERM', kapat);
process.on('SIGINT', kapat);
