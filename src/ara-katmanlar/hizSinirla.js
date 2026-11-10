// Hız sınırlama (rate limiting / throttling) — sabit pencere sayacı.
// Her istemci (IP) için pencere başına en fazla N istek. Sayaç Redis'te tutulduğu için
// birden çok uygulama sunucusu aynı sınırı paylaşır.
// Yanıt başlıkları IETF "RateLimit" taslağına uygundur; aşımda 429 + Retry-After döner.
import { onbellek } from '../onbellek/index.js';
import { ApiHatasi } from '../lib/hatalar.js';
import { logger } from '../lib/logger.js';

export function hizSinirla({ ad, pencereMs, azami, anahtar = (req) => req.ip }) {
  return async (req, res, next) => {
    try {
      const { sayi, kalanMs } = await onbellek.incr(`hiz:${ad}:${anahtar(req)}`, pencereMs);
      const sifirlanma = Math.ceil(kalanMs / 1000);
      res.set({
        'RateLimit-Limit': String(azami),
        'RateLimit-Remaining': String(Math.max(0, azami - sayi)),
        'RateLimit-Reset': String(sifirlanma),
      });
      if (sayi > azami) {
        res.set('Retry-After', String(sifirlanma));
        return next(new ApiHatasi(429, 'Çok fazla istek', `Lütfen ${sifirlanma} saniye sonra tekrar deneyin.`));
      }
      next();
    } catch (err) {
      // Sayaç servisi çökerse siteyi kilitleme: isteği geçir (fail-open) ve günlüğe yaz.
      logger.warn({ err: err.message }, 'Hız sınırlayıcı çalışmadı');
      next();
    }
  };
}
