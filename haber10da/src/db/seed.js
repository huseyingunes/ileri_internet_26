// Tohum verisi: boş veritabanına kategoriler, kullanıcılar ve örnek haberler ekler.
//   npm run db:seed          → yalnızca veritabanı boşsa ekler
//   npm run db:seed -- --sifirla → tüm haberleri silip yeniden ekler (yalnızca geliştirme)
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { count, eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db, veritabaniBaglan, veritabaniKapat } from './index.js';
import { haberler, kategoriler, kullanicilar, yenilemeBelirtecleri } from './schema.js';
import { KATEGORILER, YAZARLAR, HABERLER } from './ornek-icerik.js';
import { okumaSuresi, slugla } from '../lib/metin.js';
import { parolaOzetle } from '../kimlik/parola.js';
import { gommeUret, haberMetni } from '../ai/gomme.js';
import { logger } from '../lib/logger.js';

export async function tohumla({ sessiz = false, sifirla = false } = {}) {
  if (sifirla) {
    if (config.uretimde) throw new Error('Üretimde sıfırlama yapılamaz');
    await db.delete(yenilemeBelirtecleri);
    await db.delete(haberler);
    await db.delete(kullanicilar);
    await db.delete(kategoriler);
  }
  const [{ n }] = await db.select({ n: count() }).from(kategoriler);
  if (Number(n) > 0) {
    if (!sessiz) logger.info('Veritabanı dolu; tohumlama atlandı');
    return false;
  }

  const katIdler = {};
  for (const k of KATEGORILER) {
    const [r] = await db.insert(kategoriler).values(k).returning();
    katIdler[k.slug] = r.id;
  }

  // Yönetici hesabı
  const adminParola = config.ADMIN_PAROLA ?? (config.uretimde ? null : 'admin1234');
  if (adminParola) {
    await db.insert(kullanicilar).values({
      ad: 'haber10da yönetici',
      eposta: config.ADMIN_EPOSTA,
      rol: 'admin',
      parolaOzeti: await parolaOzetle(adminParola),
    });
  }
  // Geliştirme için örnek editör hesabı (üretimde parolasız → giriş yapılamaz)
  const editorParola = config.uretimde ? null : 'editor1234';
  const [editor] = await db
    .insert(kullanicilar)
    .values({
      ad: 'Masa Editörü',
      eposta: 'editor@haber10da.net',
      rol: 'editor',
      parolaOzeti: editorParola ? await parolaOzetle(editorParola) : null,
    })
    .returning();

  const yazarIdler = [];
  for (const y of YAZARLAR) {
    const [r] = await db.insert(kullanicilar).values({ ...y, rol: 'editor' }).returning();
    yazarIdler.push(r.id);
  }

  const simdi = Date.now();
  for (const h of HABERLER) {
    const metin = haberMetni(h);
    const { vektor, model } = await gommeUret(metin);
    await db.insert(haberler).values({
      slug: slugla(h.baslik),
      baslik: h.baslik,
      spot: h.spot,
      icerik: h.icerik,
      ozet: h.ozet,
      ozetKaynak: 'editor',
      etiketler: h.etiketler,
      okumaSuresi: okumaSuresi(`${h.spot} ${h.icerik}`),
      kategoriId: katIdler[h.kategori],
      yazarId: yazarIdler[h.yazar] ?? editor.id,
      durum: 'yayinda',
      sonDakika: Boolean(h.sonDakika),
      ornek: h.ornek ?? true,
      goruntulenme: Math.round(40 + 600 / (1 + h.saat / 6) + (randomBytes(1)[0] % 40)),
      gomme: vektor,
      gommeModel: model,
      yayinTarihi: new Date(simdi - h.saat * 3_600_000),
    });
  }

  logger.info(
    { kategori: KATEGORILER.length, haber: HABERLER.length },
    adminParola && !config.ADMIN_PAROLA
      ? 'Tohum verisi eklendi — geliştirme hesapları: admin@haber10da.net / admin1234, editor@haber10da.net / editor1234'
      : 'Tohum verisi eklendi',
  );
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { gocleriUygula } = await import('./migrate.js');
  await veritabaniBaglan();
  await gocleriUygula();
  await tohumla({ sifirla: process.argv.includes('--sifirla') });
  const [{ n }] = await db.select({ n: count() }).from(haberler).where(eq(haberler.durum, 'yayinda'));
  logger.info({ yayindaki: Number(n) }, 'Bitti');
  await veritabaniKapat();
}
