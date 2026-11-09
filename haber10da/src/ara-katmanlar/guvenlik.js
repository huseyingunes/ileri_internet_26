// Güvenlik başlıkları — helmet. Önemli olanlar:
//   Content-Security-Policy: sayfa yalnızca kendi sunucumuzdan betik/stil/yazı tipi yükleyebilir.
//     Satır içi <script> çalışmaz → XSS ile enjekte edilen kod çalışamaz.
//   Strict-Transport-Security: tarayıcı bu siteye bir yıl boyunca yalnızca HTTPS ile bağlanır.
//   X-Content-Type-Options: nosniff, Referrer-Policy, Cross-Origin-* başlıkları.
import helmet from 'helmet';
import cors from 'cors';
import { config } from '../config.js';

export const guvenlikBasliklari = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://avatars.githubusercontent.com'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      ...(config.uretimde ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  strictTransportSecurity: config.uretimde ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  crossOriginEmbedderPolicy: false,
});

// Belgeler (Swagger UI) ve GraphiQL kendi satır içi stillerini kullanır: yalnız o yollarda gevşetilir.
export const gevsekCsp = helmet.contentSecurityPolicy({
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
    imgSrc: ["'self'", 'data:', 'https://raw.githubusercontent.com'],
    fontSrc: ["'self'", 'data:', 'https://unpkg.com'],
    connectSrc: ["'self'"],
    workerSrc: ["'self'", 'blob:'],
  },
});

// CORS: başka bir kaynaktaki ön yüz (ör. Vite geliştirme sunucusu :5173) API'yi çağırabilsin.
// Tarayıcı önce OPTIONS "ön uçuş" isteği atar; izin verilen kaynakları burada belirtiriz.
export const corsAyari = cors({
  origin(kaynak, geri) {
    if (!kaynak || kaynak === config.SITE_URL || config.corsKaynaklari.includes(kaynak)) return geri(null, true);
    geri(null, false);
  },
  credentials: true,
  exposedHeaders: ['ETag', 'X-Onbellek', 'Server-Timing', 'RateLimit-Remaining', 'X-Request-Id', 'X-Sorgu-Sayisi'],
  maxAge: 600,
});
