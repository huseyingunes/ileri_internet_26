// Herkese açık okuma uç noktaları — iki katmanlı önbellek:
//   1. Sunucu tarafı (Redis, cache-aside): veritabanı yükünü azaltır.
//   2. İstemci/vekil tarafı (HTTP Cache-Control + ETag): isteği sunucuya hiç getirmez veya 304 ile biter.
import { Router } from 'express';
import { z } from 'zod';
import { performance } from 'node:perf_hooks';
import { dogrula } from '../ara-katmanlar/genel.js';
import { onbellekliJson } from '../ara-katmanlar/httpOnbellek.js';
import { hizSinirla } from '../ara-katmanlar/hizSinirla.js';
import { onbellekle, surum } from '../onbellek/index.js';
import * as servis from '../servisler/haberServisi.js';
import { ara } from '../arama/index.js';

export const haberRotalari = Router();
export const kategoriRotalari = Router();
export const aramaRotalari = Router();

const ListeSorgusu = z.object({
  kategori: z.string().regex(/^[a-z0-9-]+$/).optional(),
  sayfa: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

// Ortak desen: sürümlü anahtar → cache-aside → HTTP önbellek başlıkları
async function onbellekliYanit(req, res, { anahtar, ttl, maxAge, uretici }) {
  const bas = performance.now();
  const { veri, isabet } = await onbellekle(`v${await surum('haberler')}:${anahtar}`, ttl, uretici);
  onbellekliJson(req, res, veri, { maxAge, isabet, sureMs: performance.now() - bas });
}

haberRotalari.get('/', dogrula({ query: ListeSorgusu }), async (req, res) => {
  const { kategori, sayfa, limit } = req.gecerli.query;
  await onbellekliYanit(req, res, {
    anahtar: `liste:${kategori ?? 'tum'}:${sayfa}:${limit}`,
    ttl: 60,
    maxAge: 30,
    uretici: () => servis.listele({ kategori, sayfa, limit }),
  });
});

haberRotalari.get('/manset', async (req, res) => {
  await onbellekliYanit(req, res, { anahtar: 'manset', ttl: 30, maxAge: 15, uretici: servis.manset });
});

haberRotalari.get('/populer', async (req, res) => {
  // Sürümden bağımsız kısa ömürlü: okunma sayıları sürekli değişir
  const bas = performance.now();
  const { veri, isabet } = await onbellekle('populer', 30, () => servis.populer(5));
  onbellekliJson(req, res, veri, { maxAge: 30, isabet, sureMs: performance.now() - bas });
});

const SlugParam = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,100}$/) });

haberRotalari.get('/:slug', dogrula({ params: SlugParam }), async (req, res) => {
  const { slug } = req.gecerli.params;
  const bas = performance.now();
  const { veri, isabet } = await onbellekle(`v${await surum('haberler')}:haber:${slug}`, 120, async () =>
    servis.haberDTO(await servis.getir(slug), { icerikle: true }),
  );
  servis.goruntulemeKaydet(veri.id); // beklenmez: yanıtı geciktirmesin
  onbellekliJson(req, res, veri, { maxAge: 60, isabet, sureMs: performance.now() - bas });
});

haberRotalari.get('/:slug/benzer', dogrula({ params: SlugParam }), async (req, res) => {
  const { slug } = req.gecerli.params;
  await onbellekliYanit(req, res, {
    anahtar: `benzer:${slug}`,
    ttl: 600,
    maxAge: 300,
    uretici: () => servis.benzerHaberler(slug, 3),
  });
});

kategoriRotalari.get('/', async (req, res) => {
  const bas = performance.now();
  const { veri, isabet } = await onbellekle('kategoriler', 3600, servis.kategorileriGetir);
  onbellekliJson(req, res, veri, { maxAge: 300, swr: 3600, isabet, sureMs: performance.now() - bas });
});

aramaRotalari.get(
  '/',
  hizSinirla({ ad: 'arama', pencereMs: 60_000, azami: 40 }),
  dogrula({
    query: z.object({
      q: z.string().trim().min(2, 'En az 2 karakter girin.').max(100),
      sayfa: z.coerce.number().int().min(1).max(50).default(1),
    }),
  }),
  async (req, res) => {
    const { q, sayfa } = req.gecerli.query;
    await onbellekliYanit(req, res, {
      anahtar: `arama:${q.toLocaleLowerCase('tr-TR')}:${sayfa}`,
      ttl: 120,
      maxAge: 30,
      uretici: () => ara(q, { sayfa }),
    });
  },
);
