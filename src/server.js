// Giriş noktası: bağlantıları kur, HTTP + WebSocket sunucusunu başlat, kapanışı zarifçe yönet.
import http from 'node:http';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { veritabaniBaglan, veritabaniKapat } from './db/index.js';
import { gocleriUygula } from './db/migrate.js';
import { onbellek, onbellekBaglan } from './onbellek/index.js';
import { kuyruk, kuyrukBaglan } from './kuyruk/index.js';
import { esIndeksHazirla } from './arama/index.js';
import { isleyicileriKaydet } from './isleyiciler/haberIsleyici.js';
import { sseBaslat, sseKapat } from './canli/sse.js';
import { wsBaslat, wsKapat } from './canli/ws.js';
import { uygulamaOlustur } from './app.js';
import { tohumla } from './db/seed.js';
import { ajanZamanlayiciBaslat } from './ajan/zamanlayici.js';

await veritabaniBaglan();
await gocleriUygula();
await tohumla({ sessiz: true }); // boş veritabanına örnek içerik
await onbellekBaglan();
await kuyrukBaglan();
await esIndeksHazirla().catch((err) => logger.warn({ err: err.message }, 'Elasticsearch hazırlanamadı'));

// RabbitMQ yoksa işler bu süreçte çalışır; varsa ayrı worker süreci (npm run worker) tüketir.
if (kuyruk.tur === 'surec-ici') await isleyicileriKaydet(kuyruk);
await sseBaslat();

const sunucu = http.createServer(uygulamaOlustur());
wsBaslat(sunucu);
sunucu.keepAliveTimeout = 65_000; // yük dengeleyicinin zaman aşımından uzun olmalı

sunucu.listen(config.PORT, () => {
  logger.info(`haber10da ${config.SITE_URL} adresinde çalışıyor (port ${config.PORT})`);
  ajanZamanlayiciBaslat(config.PORT).catch((err) => logger.error({ err: err.message }, 'Ajan zamanlayıcısı başlatılamadı'));
});

// Zarif kapanış: yeni bağlantı alma, açık işleri bitir, bağlantıları kapat.
let kapaniyor = false;
async function kapat(sinyal) {
  if (kapaniyor) return;
  kapaniyor = true;
  logger.info({ sinyal }, 'Kapanış başladı');
  setTimeout(() => process.exit(1), 10_000).unref();
  sseKapat();
  wsKapat();
  sunucu.close(async () => {
    await Promise.allSettled([kuyruk.kapat(), onbellek.kapat(), veritabaniKapat()]);
    logger.info('Kapanış tamamlandı');
    process.exit(0);
  });
}
process.on('SIGTERM', kapat);
process.on('SIGINT', kapat);
