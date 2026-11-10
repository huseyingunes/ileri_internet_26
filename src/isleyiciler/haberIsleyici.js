// Arka plan işleri: haber yayımlanınca yavaş işler kuyruğa atılır, API hemen yanıt döner.
//   1. Özet yoksa → 10 saniyelik özet üret (LLM ya da çıkarımsal)
//   2. Gömme yoksa → vektör üret (benzer haberler, RAG)
//   3. Elasticsearch'e indeksle (varsa)
//   4. Önbelleği geçersiz kıl, canlı akışa "haber güncellendi" olayı gönder
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { haberler } from '../db/schema.js';
import { idIleGetir, zenginlestirmeKaydet, haberDTO } from '../servisler/haberServisi.js';
import { ozetUret } from '../ai/ozet.js';
import { gommeUret, haberMetni } from '../ai/gomme.js';
import { indeksle, indekstenSil } from '../arama/index.js';
import { surumArtir } from '../onbellek/index.js';
import { olayYayinla } from '../canli/sse.js';
import { logger } from '../lib/logger.js';

export const KONULAR = {
  yayinlandi: 'haber.yayinlandi',
  guncellendi: 'haber.guncellendi',
  silindi: 'haber.silindi',
};

export async function haberZenginlestir({ id }) {
  const h = await idIleGetir(id);
  const alanlar = {};

  if (!h.ozet) {
    const o = await ozetUret(h);
    alanlar.ozet = o.ozet;
    alanlar.ozetKaynak = o.kaynak;
    if (!h.etiketler?.length) alanlar.etiketler = o.etiketler;
  }
  const [{ gomme }] = await db.select({ gomme: haberler.gomme }).from(haberler).where(eq(haberler.id, id));
  if (!gomme) {
    const g = await gommeUret(haberMetni(h));
    alanlar.gomme = g.vektor;
    alanlar.gommeModel = g.model;
  }
  if (Object.keys(alanlar).length) await zenginlestirmeKaydet(id, alanlar);

  if (h.durum === 'yayinda') {
    await indeksle({ ...h, ...alanlar }).catch((err) => logger.warn({ err: err.message }, 'İndeksleme başarısız'));
    await surumArtir('haberler');
    const guncel = await idIleGetir(id);
    await olayYayinla('haber-guncellendi', haberDTO(guncel));
  }
  logger.info({ id, alanlar: Object.keys(alanlar) }, 'Haber zenginleştirildi');
}

export async function haberSilindi({ id }) {
  await indekstenSil(id).catch(() => {});
  await surumArtir('haberler');
}

export async function isleyicileriKaydet(kuyruk) {
  await kuyruk.tuket('haber-isleme', [KONULAR.yayinlandi, KONULAR.guncellendi], haberZenginlestir);
  await kuyruk.tuket('haber-silme', [KONULAR.silindi], haberSilindi);
}
