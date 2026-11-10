// RSS toplayıcı: dış kaynaklardan başlık + kısa açıklama + bağlantı alır.
// Telif: haberin tam metni kopyalanmaz; yalnızca RSS'te yayımlanan özet ve kaynağa bağlantı saklanır.
//
// RSS_KAYNAKLARI="https://ornek.edu.tr/rss|kampus|Kaynak Adı,https://...|teknoloji|Diğer Kaynak"
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db, veritabaniBaglan, veritabaniKapat } from '../db/index.js';
import { haberler, kategoriler, kullanicilar } from '../db/schema.js';
import { kuyruk, kuyrukBaglan } from '../kuyruk/index.js';
import { KONULAR } from '../isleyiciler/haberIsleyici.js';
import { cumlelereBol, okumaSuresi, slugla } from '../lib/metin.js';
import { rssGetir } from '../lib/rss.js';
import { logger } from '../lib/logger.js';

async function botKullanici() {
  const eposta = 'bot@haber10da.net';
  const [var_] = await db.select().from(kullanicilar).where(eq(kullanicilar.eposta, eposta));
  if (var_) return var_;
  const [k] = await db.insert(kullanicilar).values({ eposta, ad: 'haber10da derleme', rol: 'editor' }).returning();
  return k;
}

export { rssCoz } from '../lib/rss.js';

export async function rssTopla() {
  const kaynaklar = config.RSS_KAYNAKLARI.split(',').map((s) => s.trim()).filter(Boolean);
  const bot = await botKullanici();
  const eklenen = [];
  for (const tanim of kaynaklar) {
    const [url, kategoriSlug = 'gundem', kaynakAd = new URL(tanim.split('|')[0]).hostname] = tanim.split('|');
    const [kategori] = await db.select().from(kategoriler).where(eq(kategoriler.slug, kategoriSlug));
    if (!kategori) {
      logger.warn({ kategoriSlug }, 'RSS: kategori bulunamadı');
      continue;
    }
    for (const o of (await rssGetir(url)).slice(0, 20)) {
      // Yalnızca http(s) bağlantıları: "javascript:" gibi şemalar XSS'e kapı açar
      if (!o.baslik || !/^https?:\/\//.test(o.baglanti ?? '') || o.aciklama.length < 40) continue;
      const [yeni] = await db
        .insert(haberler)
        .values({
          slug: `${slugla(o.baslik)}-${Date.now().toString(36)}`,
          baslik: o.baslik.slice(0, 160),
          spot: cumlelereBol(o.aciklama)[0]?.slice(0, 320) ?? o.aciklama.slice(0, 320),
          icerik: o.aciklama,
          okumaSuresi: okumaSuresi(o.aciklama),
          kategoriId: kategori.id,
          yazarId: bot.id,
          durum: 'yayinda',
          kaynakAd,
          kaynakUrl: o.baglanti,
          yayinTarihi: o.tarih,
        })
        .onConflictDoNothing({ target: haberler.kaynakUrl }) // aynı haber iki kez eklenmesin
        .returning({ id: haberler.id });
      if (yeni) {
        eklenen.push(yeni.id);
        await kuyruk.yayinla(KONULAR.yayinlandi, { id: yeni.id });
      }
    }
  }
  logger.info({ eklenen: eklenen.length }, 'RSS toplama bitti');
  return eklenen;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await veritabaniBaglan();
  await kuyrukBaglan();
  const idler = await rssTopla();
  // RabbitMQ yoksa kimse kuyruğu dinlemiyor: zenginleştirmeyi burada sırayla yap
  if (kuyruk.tur === 'surec-ici') {
    const { haberZenginlestir } = await import('../isleyiciler/haberIsleyici.js');
    for (const id of idler) await haberZenginlestir({ id });
  }
  await veritabaniKapat();
  await kuyruk.kapat();
}
