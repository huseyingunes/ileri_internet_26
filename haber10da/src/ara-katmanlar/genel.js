// Genel ara katmanlar: istek kimliği, doğrulama, metrik zamanlayıcı, hata işleyici.
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ApiHatasi } from '../lib/hatalar.js';
import { istekSuresi } from '../lib/metrikler.js';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';

// Her isteğe bir kimlik: günlükte bir isteğin tüm izini sürmeyi sağlar (izlenebilirlik).
export function istekKimligi(req, res, next) {
  req.id = req.get('x-request-id') ?? randomUUID();
  res.set('X-Request-Id', req.id);
  next();
}

export function metrikZamanlayici(req, res, next) {
  const bitir = istekSuresi.startTimer();
  res.on('finish', () => {
    const rota = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.baseUrl || 'diger';
    bitir({ yontem: req.method, rota, durum: res.statusCode });
  });
  next();
}

// zod şemasıyla body/query/params doğrulama. Doğrulanan veri req.gecerli içine yazılır.
export const dogrula = (semalar) => (req, _res, next) => {
  try {
    req.gecerli = {};
    for (const [yer, sema] of Object.entries(semalar)) req.gecerli[yer] = sema.parse(req[yer] ?? {});
    next();
  } catch (err) {
    next(err);
  }
};

export function bulunamadiIsleyici(req, _res, next) {
  next(new ApiHatasi(404, 'Uç nokta bulunamadı', `${req.method} ${req.originalUrl} tanımlı değil.`));
}

// Tüm hatalar buraya düşer → RFC 9457 problem+json
export function hataIsleyici(err, req, res, _next) {
  let durum = 500;
  let govde = { title: 'Sunucu hatası', detail: 'Beklenmeyen bir hata oluştu. İstek kimliğiyle bildirebilirsiniz.' };

  if (err instanceof ApiHatasi) {
    durum = err.durum;
    govde = { title: err.baslik, detail: err.message, ...err.ek };
  } else if (err instanceof z.ZodError) {
    durum = 400;
    govde = {
      title: 'Doğrulama hatası',
      detail: 'Gönderilen veriler geçersiz.',
      alanlar: err.issues.map((i) => ({ alan: i.path.join('.'), mesaj: i.message })),
    };
  } else if (err.type === 'entity.parse.failed') {
    durum = 400;
    govde = { title: 'Geçersiz JSON', detail: 'İstek gövdesi çözümlenemedi.' };
  } else if (err.type === 'entity.too.large') {
    durum = 413;
    govde = { title: 'İstek çok büyük', detail: 'Gövde 200 KB sınırını aşıyor.' };
  }

  if (durum >= 500) logger.error({ err, istek: req.id }, 'İşlenmeyen hata');
  if (durum >= 500 && !config.uretimde) govde.hata = err.message;

  res
    .status(durum)
    .type('application/problem+json')
    .json({ type: 'about:blank', status: durum, instance: req.originalUrl, istekKimligi: req.id, ...govde });
}
