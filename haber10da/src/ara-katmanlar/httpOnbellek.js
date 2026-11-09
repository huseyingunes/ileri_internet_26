// HTTP önbellekleme: tarayıcı ve ara vekiller (Nginx, CDN) yanıtı saklayıp tekrar kullanabilsin.
//
//   Cache-Control: public, max-age=30, stale-while-revalidate=120
//     → 30 sn taze; sonraki 120 sn eski kopya hemen gösterilir, arkada yenilenir.
//   ETag: "W/<özet>"  → içerik parmak izi
//   İstemci tekrar sorduğunda If-None-Match: <etag> gönderir; değişmediyse 304 (gövdesiz) döneriz.
//
// Ayrıca Server-Timing başlığı: tarayıcı geliştirici araçlarında sunucu süreleri görünür.
import { createHash } from 'node:crypto';

export function etagHesapla(govde) {
  return `W/"${createHash('sha1').update(govde).digest('base64url').slice(0, 27)}"`;
}

export function onbellekliJson(req, res, veri, { maxAge = 30, swr = 120, ozel = false, isabet, sureMs } = {}) {
  const govde = JSON.stringify(veri);
  const etag = etagHesapla(govde);
  res.set('ETag', etag);
  res.set('Cache-Control', `${ozel ? 'private' : 'public'}, max-age=${maxAge}, stale-while-revalidate=${swr}`);
  res.set('Vary', 'Accept-Encoding');
  if (isabet !== undefined) res.set('X-Onbellek', isabet ? 'ISABET' : 'KACIRMA');
  if (sureMs !== undefined) {
    res.set('Server-Timing', `uygulama;dur=${sureMs.toFixed(1)};desc="${isabet ? 'Redis' : 'Veritabani'}"`);
  }

  const gelen = req.get('if-none-match');
  if (gelen && gelen.split(',').map((s) => s.trim()).includes(etag)) {
    return res.status(304).end();
  }
  res.type('application/json').send(govde);
}

// Kişiye özel veya hassas yanıtlar hiçbir yerde saklanmamalı.
export const onbellekYasak = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};
