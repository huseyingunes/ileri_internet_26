// Sistem ve ders uç noktaları: sağlık denetimi, hazır olma, metrikler, bileşen durumu, N+1 gösterimi.
import { Router } from 'express';
import { z } from 'zod';
import { performance } from 'node:perf_hooks';
import { desc, eq, sql } from 'drizzle-orm';
import { config } from '../config.js';
import { db, sorguBaglami, veritabaniTuru } from '../db/index.js';
import { haberler, kategoriler, kullanicilar } from '../db/schema.js';
import { onbellek } from '../onbellek/index.js';
import { kuyruk } from '../kuyruk/index.js';
import { aramaMotoru } from '../arama/index.js';
import { llmDevresi } from '../ai/llm.js';
import { YEREL_MODEL } from '../ai/gomme.js';
import { kayit } from '../lib/metrikler.js';
import { temelKimlik } from '../kimlik/ara-katmanlar.js';
import { dogrula } from '../ara-katmanlar/genel.js';
import { onbellekYasak } from '../ara-katmanlar/httpOnbellek.js';
import { sseIstemciSayisi } from '../canli/sse.js';
import { wsIstemciSayisi } from '../canli/ws.js';

export const sistemRotalari = Router();
sistemRotalari.use(onbellekYasak);

const BASLANGIC = Date.now();

async function olc(fn) {
  const bas = performance.now();
  try {
    await fn();
    return { durum: 'calisiyor', gecikmeMs: +(performance.now() - bas).toFixed(1) };
  } catch (err) {
    return { durum: 'hata', hata: err.message };
  }
}

// Canlılık (liveness): süreç ayakta mı? Orkestratör buna göre yeniden başlatır.
sistemRotalari.get('/saglik', (_req, res) => res.json({ durum: 'ayakta', zaman: new Date().toISOString() }));

// Hazır olma (readiness): trafik almaya hazır mı? Veritabanı yoksa yük dengeleyici bu sunucuya istek yollamaz.
sistemRotalari.get('/hazir', async (_req, res) => {
  const vt = await olc(() => db.execute(sql`select 1`));
  const ob = await olc(() => onbellek.saglik());
  const hazir = vt.durum === 'calisiyor';
  res.status(hazir ? 200 : 503).json({ hazir, veritabani: vt, onbellek: ob });
});

sistemRotalari.get('/sistem/durum', async (_req, res) => {
  const [vt, ob] = await Promise.all([olc(() => db.execute(sql`select 1`)), olc(() => onbellek.saglik())]);
  const [{ sayi }] = await db.select({ sayi: sql`count(*)::int` }).from(haberler);
  res.json({
    surum: process.env.npm_package_version ?? '1.0.0',
    ortam: config.NODE_ENV,
    node: process.version,
    calismaSuresiSn: Math.round((Date.now() - BASLANGIC) / 1000),
    bilesenler: {
      veritabani: { tur: veritabaniTuru, ...vt, haberSayisi: sayi },
      onbellek: { tur: onbellek.tur, ...ob },
      kuyruk: { tur: kuyruk.tur },
      arama: { motor: aramaMotoru() },
      llm: { acik: config.llmAcik, model: config.llmAcik ? config.LLM_MODEL : null, devre: llmDevresi.durum },
      gomme: { model: config.llmAcik ? config.EMBED_MODEL : YEREL_MODEL },
      oauth: { github: config.githubAcik },
      canli: { sse: sseIstemciSayisi(), websocket: wsIstemciSayisi() },
    },
  });
});

sistemRotalari.get('/metrics', temelKimlik, async (_req, res) => {
  res.set('Content-Type', kayit.contentType).send(await kayit.metrics());
});

// N+1 sorunu canlı gösterimi.
//   kotu: önce 20 haber, sonra her haber için ayrı yazar ve kategori sorgusu → 1 + 2N sorgu (20 haber için 41)
//   iyi : ilişkisel sorgu (JOIN / LATERAL) ile tek seferde → 1 sorgu
sistemRotalari.get(
  '/ders/n-arti-bir',
  dogrula({ query: z.object({ mod: z.enum(['kotu', 'iyi']).default('kotu') }) }),
  async (req, res) => {
    const { mod } = req.gecerli.query;
    const baglam = { sorgular: 0, kaydet: true, liste: [] };
    const bas = performance.now();
    const sonuc = await sorguBaglami.run(baglam, async () => {
      if (mod === 'kotu') {
        const liste = await db.select().from(haberler).orderBy(desc(haberler.id)).limit(20);
        const cikti = [];
        for (const h of liste) {
          const [yazar] = await db.select().from(kullanicilar).where(eq(kullanicilar.id, h.yazarId));
          const [kategori] = await db.select().from(kategoriler).where(eq(kategoriler.id, h.kategoriId));
          cikti.push({ baslik: h.baslik, yazar: yazar.ad, kategori: kategori.ad });
        }
        return cikti;
      }
      const liste = await db.query.haberler.findMany({
        orderBy: [desc(haberler.id)],
        limit: 20,
        columns: { baslik: true },
        with: { yazar: { columns: { ad: true } }, kategori: { columns: { ad: true } } },
      });
      return liste.map((h) => ({ baslik: h.baslik, yazar: h.yazar.ad, kategori: h.kategori.ad }));
    });
    res.json({
      mod,
      sorguSayisi: baglam.sorgular,
      sureMs: +(performance.now() - bas).toFixed(1),
      ornekSorgular: [...new Set(baglam.liste)].slice(0, 3),
      kayitSayisi: sonuc.length,
    });
  },
);
