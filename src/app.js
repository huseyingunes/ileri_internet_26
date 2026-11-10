// Express uygulaması — ara katmanların sırası önemlidir:
//   istek kimliği → günlük → metrik → güvenlik başlıkları → sıkıştırma → gövde/çerez çözümleme
//   → kimlik çözme → rotalar → statik dosyalar → SPA geri dönüşü → 404 → hata işleyici
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { istekKimligi, metrikZamanlayici, bulunamadiIsleyici, hataIsleyici } from './ara-katmanlar/genel.js';
import { guvenlikBasliklari, gevsekCsp, corsAyari } from './ara-katmanlar/guvenlik.js';
import { hizSinirla } from './ara-katmanlar/hizSinirla.js';
import { kimlikCoz } from './kimlik/ara-katmanlar.js';
import { haberRotalari, kategoriRotalari, aramaRotalari } from './rotalar/haberler.js';
import { authRotalari } from './rotalar/auth.js';
import { editorRotalari, adminRotalari } from './rotalar/editor.js';
import { sistemRotalari } from './rotalar/sistem.js';
import { asistanRotalari } from './rotalar/asistan.js';
import { sseIsleyici } from './canli/sse.js';
import { graphqlUygulamasi } from './graphql/index.js';
import { dersKlasorleri } from './ara-katmanlar/dersKlasorleri.js';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const genel = path.join(kok, 'public');
const openapi = YAML.parse(readFileSync(path.join(kok, 'openapi.yaml'), 'utf8'));

export function uygulamaOlustur() {
  const app = express();
  app.disable('x-powered-by'); // sunucu teknolojisini ilan etme
  app.set('etag', false); // ETag'i kendimiz hesaplıyoruz (httpOnbellek.js)
  app.set('trust proxy', config.uretimde ? 1 : 'loopback'); // Nginx arkasında gerçek istemci IP'si

  app.use(istekKimligi);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      autoLogging: { ignore: (req) => req.url.startsWith('/fonts') || req.url.startsWith('/api/saglik') },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    }),
  );
  app.use(metrikZamanlayici);

  // Ders klasörleri (2_sinav vb.) sitenin CSP'sinden önce, eski kurallarla yayınlanır
  app.use(dersKlasorleri(kok));

  // GraphiQL ve Swagger UI için gevşek CSP; geri kalan her yerde sıkı CSP
  app.use(['/graphql', '/api/belgeler'], gevsekCsp);
  app.use((req, res, next) => (req.path.startsWith('/graphql') || req.path.startsWith('/api/belgeler') ? next() : guvenlikBasliklari(req, res, next)));

  app.use(
    compression({
      // SSE akışları sıkıştırılmaz: sıkıştırıcı tamponlar, olaylar gecikir
      filter: (req, res) => !String(res.getHeader('Content-Type') ?? '').includes('text/event-stream') && compression.filter(req, res),
    }),
  );
  app.use('/api', corsAyari);
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser(config.JWT_SECRET));
  app.use(kimlikCoz);

  // Genel API hız sınırı: IP başına dakikada 300 istek
  app.use('/api', hizSinirla({ ad: 'genel', pencereMs: 60_000, azami: 300 }));

  app.use('/api', sistemRotalari);
  app.use('/api/auth', authRotalari);
  app.use('/api/haberler', haberRotalari);
  app.use('/api/kategoriler', kategoriRotalari);
  app.use('/api/arama', aramaRotalari);
  app.use('/api/asistan', asistanRotalari);
  app.use('/api/editor', editorRotalari);
  app.use('/api/admin', adminRotalari);
  app.get('/api/canli/akis', sseIsleyici);
  app.get('/openapi.json', (_req, res) => res.json(openapi));
  app.use('/api/belgeler', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'haber10da API belgeleri' }));
  app.use('/graphql', graphqlUygulamasi);
  app.use('/api', bulunamadiIsleyici);

  // Statik dosyalar: yazı tipleri değişmez → 1 yıl; CSS/JS → 1 saat + yeniden doğrulama
  const fontlar = path.join(kok, 'node_modules/@fontsource-variable');
  app.use('/fonts/bricolage', express.static(path.join(fontlar, 'bricolage-grotesque/files'), { immutable: true, maxAge: '1y' }));
  app.use('/fonts/source-serif', express.static(path.join(fontlar, 'source-serif-4/files'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(genel, { maxAge: config.uretimde ? '1h' : 0, index: false }));

  // SPA geri dönüşü: /haber/abc gibi tüm sayfa yolları index.html'i alır, yönlendirmeyi tarayıcı yapar
  app.get(/^\/(?!api\/|graphql).*/, (_req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(genel, 'index.html'));
  });

  app.use(bulunamadiIsleyici);
  app.use(hataIsleyici);
  return app;
}
