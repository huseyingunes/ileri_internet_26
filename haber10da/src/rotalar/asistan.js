// "Haberlere sor" — POST isteğine akışlı (text/event-stream) yanıt.
// EventSource yalnızca GET destekler; bu yüzden ön yüz fetch + ReadableStream ile okur.
import { Router } from 'express';
import { z } from 'zod';
import { dogrula } from '../ara-katmanlar/genel.js';
import { hizSinirla } from '../ara-katmanlar/hizSinirla.js';
import { sor } from '../ai/asistan.js';
import { logger } from '../lib/logger.js';

export const asistanRotalari = Router();

asistanRotalari.post(
  '/sor',
  hizSinirla({ ad: 'asistan', pencereMs: 60_000, azami: 8 }),
  dogrula({ body: z.object({ soru: z.string().trim().min(3, 'Soru en az 3 karakter olmalı.').max(300) }) }),
  async (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    });
    let kapandi = false;
    res.on('close', () => (kapandi = true));
    const yaz = (olay, veri) => {
      if (!kapandi) res.write(`event: ${olay}\ndata: ${JSON.stringify(veri)}\n\n`);
    };
    try {
      await sor(req.gecerli.body.soru, yaz);
    } catch (err) {
      logger.warn({ err: err.message }, 'Asistan yanıtı yarıda kaldı');
      yaz('hata', { mesaj: 'Yanıt üretilirken bir sorun oluştu. Birazdan tekrar deneyin.' });
    }
    res.end();
  },
);
