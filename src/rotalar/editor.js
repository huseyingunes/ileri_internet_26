// Editör ve yönetici uç noktaları — RBAC: yalnızca 'editor' ve 'admin' rolleri.
import { Router } from 'express';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { kullanicilar } from '../db/schema.js';
import { dogrula } from '../ara-katmanlar/genel.js';
import { hizSinirla } from '../ara-katmanlar/hizSinirla.js';
import { onbellekYasak } from '../ara-katmanlar/httpOnbellek.js';
import { rolGerekli } from '../kimlik/ara-katmanlar.js';
import * as servis from '../servisler/haberServisi.js';
import { ozetUret } from '../ai/ozet.js';
import { kuyruk } from '../kuyruk/index.js';
import { KONULAR } from '../isleyiciler/haberIsleyici.js';
import { surumArtir } from '../onbellek/index.js';
import { olayYayinla } from '../canli/sse.js';
import { kullaniciDTO } from './auth.js';
import { bulunamadi } from '../lib/hatalar.js';

export const editorRotalari = Router();
editorRotalari.use(rolGerekli('editor', 'admin'), onbellekYasak);

const HaberGovdesi = z.object({
  baslik: z.string().trim().min(10, 'Başlık en az 10 karakter olmalı.').max(160),
  spot: z.string().trim().min(20, 'Spot en az 20 karakter olmalı.').max(320),
  icerik: z.string().trim().min(50, 'Haber metni en az 50 karakter olmalı.').max(20_000),
  kategoriId: z.coerce.number().int().positive(),
  sonDakika: z.boolean().default(false),
  ozet: z.string().trim().max(400).nullable().optional(),
  ozetKaynak: z.enum(['editor', 'yz', 'cikarimsal']).optional(),
  etiketler: z.array(z.string().trim().toLowerCase().min(2).max(30)).max(6).default([]),
  // Derlenen haberlerde kaynak gösterimi (ör. günlük haber ajanı). Yalnızca http(s) bağlantı.
  kaynakAd: z.string().trim().min(2).max(80).optional(),
  kaynakUrl: z.url({ protocol: /^https?$/ }).max(500).optional(),
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

editorRotalari.get('/haberler', async (req, res) => {
  res.json(await servis.editorListesi(req.kullanici));
});

editorRotalari.get('/haberler/:id', dogrula({ params: IdParam }), async (req, res) => {
  res.json(servis.haberDTO(await servis.idIleGetir(req.gecerli.params.id), { icerikle: true }));
});

editorRotalari.post('/haberler', dogrula({ body: HaberGovdesi }), async (req, res) => {
  const h = await servis.olustur(req.gecerli.body, req.kullanici.id);
  res.status(201).location(`/api/editor/haberler/${h.id}`).json(servis.haberDTO(h, { icerikle: true }));
});

editorRotalari.patch(
  '/haberler/:id',
  dogrula({ params: IdParam, body: HaberGovdesi.partial() }),
  async (req, res) => {
    const h = await servis.guncelle(req.gecerli.params.id, req.gecerli.body, req.kullanici);
    if (h.durum === 'yayinda') {
      await surumArtir('haberler');
      await kuyruk.yayinla(KONULAR.guncellendi, { id: h.id });
    }
    res.json(servis.haberDTO(h, { icerikle: true }));
  },
);

editorRotalari.post('/haberler/:id/yayinla', dogrula({ params: IdParam }), async (req, res) => {
  const h = await servis.yayinla(req.gecerli.params.id, req.kullanici);
  const dto = servis.haberDTO(h);
  await surumArtir('haberler'); // tüm liste önbellekleri geçersiz
  await olayYayinla('haber-yayinlandi', dto);
  if (h.sonDakika) await olayYayinla('son-dakika', dto);
  await kuyruk.yayinla(KONULAR.yayinlandi, { id: h.id }); // özet + gömme arka planda
  res.json(servis.haberDTO(h, { icerikle: true }));
});

editorRotalari.post('/haberler/:id/geri-al', dogrula({ params: IdParam }), async (req, res) => {
  const h = await servis.yayindanKaldir(req.gecerli.params.id, req.kullanici);
  await surumArtir('haberler');
  await kuyruk.yayinla(KONULAR.silindi, { id: h.id });
  res.json(servis.haberDTO(h, { icerikle: true }));
});

editorRotalari.delete('/haberler/:id', dogrula({ params: IdParam }), async (req, res) => {
  const h = await servis.sil(req.gecerli.params.id, req.kullanici);
  await kuyruk.yayinla(KONULAR.silindi, { id: h.id });
  res.status(204).end();
});

editorRotalari.post(
  '/ozet-onizle',
  hizSinirla({ ad: 'ozet', pencereMs: 60_000, azami: 10, anahtar: (req) => `k${req.kullanici.id}` }),
  dogrula({ body: HaberGovdesi.pick({ baslik: true, spot: true, icerik: true }) }),
  async (req, res) => {
    res.json(await ozetUret(req.gecerli.body));
  },
);

export const adminRotalari = Router();
adminRotalari.use(rolGerekli('admin'), onbellekYasak);

adminRotalari.get('/kullanicilar', async (_req, res) => {
  const liste = await db.select().from(kullanicilar).orderBy(asc(kullanicilar.id));
  res.json(liste.map(kullaniciDTO));
});

adminRotalari.patch(
  '/kullanicilar/:id',
  dogrula({ params: IdParam, body: z.object({ rol: z.enum(['okur', 'editor', 'admin']) }) }),
  async (req, res) => {
    const [k] = await db
      .update(kullanicilar)
      .set({ rol: req.gecerli.body.rol })
      .where(eq(kullanicilar.id, req.gecerli.params.id))
      .returning();
    if (!k) throw bulunamadi('Kullanıcı');
    res.json(kullaniciDTO(k));
  },
);
