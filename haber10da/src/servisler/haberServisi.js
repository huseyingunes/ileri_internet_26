// Haber iş mantığı. Rotalar (HTTP), GraphQL ve worker bu katmanı ortak kullanır:
// iş kuralları tek yerde durur, taşıma katmanı (REST/GraphQL) değişse de etkilenmez.
import { and, count, desc, eq, inArray, notInArray, isNotNull, ne, sql, cosineDistance, gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { haberler, kategoriler, kullanicilar } from '../db/schema.js';
import { onbellek } from '../onbellek/index.js';
import { bulunamadi, yasak } from '../lib/hatalar.js';
import { okumaSuresi, slugla } from '../lib/metin.js';

const LISTE_SUTUNLARI = { icerik: false, gomme: false };
const YAZAR_SUTUNLARI = { columns: { id: true, ad: true, avatar: true } };

// Veritabanı satırını API'nin sözleşmesine (DTO) dönüştür. İç alanlar dışarı sızmaz.
export function haberDTO(h, { icerikle = false } = {}) {
  const dto = {
    id: h.id,
    slug: h.slug,
    baslik: h.baslik,
    spot: h.spot,
    ozet: h.ozet,
    ozetKaynak: h.ozetKaynak,
    etiketler: h.etiketler ?? [],
    okumaSuresi: h.okumaSuresi,
    sonDakika: h.sonDakika,
    ornek: h.ornek,
    durum: h.durum,
    goruntulenme: h.goruntulenme,
    kaynak: h.kaynakUrl ? { ad: h.kaynakAd, url: h.kaynakUrl } : null,
    yayinTarihi: h.yayinTarihi,
    guncelleme: h.guncelleme,
    kategori: h.kategori ? { id: h.kategori.id, ad: h.kategori.ad, slug: h.kategori.slug, renk: h.kategori.renk } : null,
    yazar: h.yazar ? { id: h.yazar.id, ad: h.yazar.ad, avatar: h.yazar.avatar } : null,
  };
  if (icerikle) dto.icerik = h.icerik;
  return dto;
}

export async function kategorileriGetir() {
  return db.select().from(kategoriler).orderBy(kategoriler.sira);
}

async function kategoriBul(slug) {
  const [k] = await db.select().from(kategoriler).where(eq(kategoriler.slug, slug)).limit(1);
  if (!k) throw bulunamadi('Kategori');
  return k;
}

export async function listele({ kategori, sayfa = 1, limit = 12 } = {}) {
  const kosullar = [eq(haberler.durum, 'yayinda')];
  let kategoriKaydi = null;
  if (kategori) {
    kategoriKaydi = await kategoriBul(kategori);
    kosullar.push(eq(haberler.kategoriId, kategoriKaydi.id));
  }
  const nerede = and(...kosullar);

  // İlişkisel sorgu: yazar ve kategori TEK SQL içinde gelir (N+1 yok).
  const [satirlar, [{ toplam }]] = await Promise.all([
    db.query.haberler.findMany({
      where: nerede,
      orderBy: [desc(haberler.yayinTarihi)],
      limit,
      offset: (sayfa - 1) * limit,
      columns: LISTE_SUTUNLARI,
      with: { yazar: YAZAR_SUTUNLARI, kategori: true },
    }),
    db.select({ toplam: count() }).from(haberler).where(nerede),
  ]);

  return {
    haberler: satirlar.map((h) => haberDTO(h)),
    kategori: kategoriKaydi,
    sayfa,
    limit,
    toplam: Number(toplam),
    sayfaSayisi: Math.max(1, Math.ceil(Number(toplam) / limit)),
  };
}

export async function manset() {
  const birGunOnce = new Date(Date.now() - 24 * 3600 * 1000);
  const [one, sonDakika] = await Promise.all([
    db.query.haberler.findMany({
      where: and(eq(haberler.durum, 'yayinda'), isNotNull(haberler.ozet)),
      orderBy: [desc(haberler.yayinTarihi)],
      limit: 5,
      columns: LISTE_SUTUNLARI,
      with: { yazar: YAZAR_SUTUNLARI, kategori: true },
    }),
    db.query.haberler.findMany({
      where: and(eq(haberler.durum, 'yayinda'), eq(haberler.sonDakika, true), gte(haberler.yayinTarihi, birGunOnce)),
      orderBy: [desc(haberler.yayinTarihi)],
      limit: 3,
      columns: LISTE_SUTUNLARI,
      with: { kategori: true },
    }),
  ]);
  return { manset: one.map((h) => haberDTO(h)), sonDakika: sonDakika.map((h) => haberDTO(h)) };
}

export async function getir(slug, { taslakDahil = false } = {}) {
  const h = await db.query.haberler.findFirst({
    where: taslakDahil ? eq(haberler.slug, slug) : and(eq(haberler.slug, slug), eq(haberler.durum, 'yayinda')),
    columns: { gomme: false },
    with: { yazar: YAZAR_SUTUNLARI, kategori: true },
  });
  if (!h) throw bulunamadi('Haber');
  return h;
}

export async function idIleGetir(id) {
  const h = await db.query.haberler.findFirst({
    where: eq(haberler.id, id),
    columns: { gomme: false },
    with: { yazar: YAZAR_SUTUNLARI, kategori: true },
  });
  if (!h) throw bulunamadi('Haber');
  return h;
}

// Okunma sayısı: Redis ZSET anlık sıralama, veritabanı kalıcı toplam.
export async function goruntulemeKaydet(id) {
  await Promise.allSettled([
    onbellek.zincr(`populer:${gunAnahtari()}`, String(id)),
    db.update(haberler).set({ goruntulenme: sql`${haberler.goruntulenme} + 1` }).where(eq(haberler.id, id)),
  ]);
}

function gunAnahtari(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export async function populer(adet = 5) {
  const ustler = await onbellek.ztop(`populer:${gunAnahtari()}`, adet);
  let satirlar = [];
  if (ustler.length) {
    const idler = ustler.map((u) => Number(u.uye));
    const bulunan = await db.query.haberler.findMany({
      where: and(inArray(haberler.id, idler), eq(haberler.durum, 'yayinda')),
      columns: LISTE_SUTUNLARI,
      with: { kategori: true },
    });
    const harita = new Map(bulunan.map((h) => [h.id, h]));
    satirlar = idler.map((id) => harita.get(id)).filter(Boolean);
  }
  if (satirlar.length < adet) {
    // Bugün yeterli okuma yoksa tüm zamanların toplamıyla tamamla
    const ek = await db.query.haberler.findMany({
      where: and(
        eq(haberler.durum, 'yayinda'),
        satirlar.length ? notInArray(haberler.id, satirlar.map((h) => h.id)) : undefined,
      ),
      orderBy: [desc(haberler.goruntulenme), desc(haberler.yayinTarihi)],
      limit: adet - satirlar.length,
      columns: LISTE_SUTUNLARI,
      with: { kategori: true },
    });
    satirlar = [...satirlar, ...ek];
  }
  return satirlar.map((h) => haberDTO(h));
}

// Vektör benzerliği: kosinüs uzaklığı küçük olan en yakın haberler (pgvector <=> işleci)
export async function vektorleAra(vektor, model, { adet = 5, haric } = {}) {
  const uzaklik = cosineDistance(haberler.gomme, vektor);
  const kosullar = [eq(haberler.durum, 'yayinda'), eq(haberler.gommeModel, model), isNotNull(haberler.gomme)];
  if (haric) kosullar.push(ne(haberler.id, haric));
  const satirlar = await db
    .select({ id: haberler.id, uzaklik })
    .from(haberler)
    .where(and(...kosullar))
    .orderBy(uzaklik)
    .limit(adet);
  if (!satirlar.length) return [];
  const tam = await db.query.haberler.findMany({
    where: inArray(haberler.id, satirlar.map((s) => s.id)),
    columns: LISTE_SUTUNLARI,
    with: { kategori: true, yazar: YAZAR_SUTUNLARI },
  });
  const harita = new Map(tam.map((h) => [h.id, h]));
  return satirlar.map((s) => ({ ...haberDTO(harita.get(s.id)), benzerlik: 1 - Number(s.uzaklik) }));
}

export async function benzerHaberler(slug, adet = 3) {
  const [h] = await db
    .select({ id: haberler.id, gomme: haberler.gomme, gommeModel: haberler.gommeModel })
    .from(haberler)
    .where(eq(haberler.slug, slug))
    .limit(1);
  if (!h) throw bulunamadi('Haber');
  if (!h.gomme) return [];
  return vektorleAra(h.gomme, h.gommeModel, { adet, haric: h.id });
}

async function benzersizSlug(baslik, haricId) {
  const temel = slugla(baslik) || 'haber';
  let aday = temel;
  for (let i = 2; ; i++) {
    const [var_] = await db
      .select({ id: haberler.id })
      .from(haberler)
      .where(haricId ? and(eq(haberler.slug, aday), ne(haberler.id, haricId)) : eq(haberler.slug, aday))
      .limit(1);
    if (!var_) return aday;
    aday = `${temel}-${i}`;
  }
}

export async function olustur(veri, yazarId) {
  const slug = await benzersizSlug(veri.baslik);
  const [h] = await db
    .insert(haberler)
    .values({
      ...veri,
      slug,
      yazarId,
      okumaSuresi: okumaSuresi(`${veri.spot} ${veri.icerik}`),
      ozetKaynak: veri.ozet ? 'editor' : null,
      durum: 'taslak',
    })
    .returning({ id: haberler.id });
  return idIleGetir(h.id);
}

function duzenleyebilirMi(haber, kullanici) {
  return kullanici.rol === 'admin' || haber.yazarId === kullanici.id;
}

export async function guncelle(id, veri, kullanici) {
  const mevcut = await idIleGetir(id);
  if (!duzenleyebilirMi(mevcut, kullanici)) throw yasak('Yalnızca kendi haberinizi düzenleyebilirsiniz.');
  const degisiklik = { ...veri, guncelleme: new Date() };
  if (veri.baslik && veri.baslik !== mevcut.baslik && mevcut.durum === 'taslak') {
    degisiklik.slug = await benzersizSlug(veri.baslik, id);
  }
  if (veri.icerik || veri.spot) {
    degisiklik.okumaSuresi = okumaSuresi(`${veri.spot ?? mevcut.spot} ${veri.icerik ?? mevcut.icerik}`);
    degisiklik.gomme = null; // içerik değişti: gömme yeniden üretilecek
  }
  if ('ozet' in veri) degisiklik.ozetKaynak = veri.ozet ? (veri.ozetKaynak ?? 'editor') : null;
  await db.update(haberler).set(degisiklik).where(eq(haberler.id, id));
  return idIleGetir(id);
}

export async function yayinla(id, kullanici) {
  const mevcut = await idIleGetir(id);
  if (!duzenleyebilirMi(mevcut, kullanici)) throw yasak();
  await db
    .update(haberler)
    .set({ durum: 'yayinda', yayinTarihi: mevcut.yayinTarihi ?? new Date(), guncelleme: new Date() })
    .where(eq(haberler.id, id));
  return idIleGetir(id);
}

export async function yayindanKaldir(id, kullanici) {
  const mevcut = await idIleGetir(id);
  if (!duzenleyebilirMi(mevcut, kullanici)) throw yasak();
  await db.update(haberler).set({ durum: 'taslak', guncelleme: new Date() }).where(eq(haberler.id, id));
  return idIleGetir(id);
}

export async function sil(id, kullanici) {
  const mevcut = await idIleGetir(id);
  if (!duzenleyebilirMi(mevcut, kullanici)) throw yasak();
  await db.delete(haberler).where(eq(haberler.id, id));
  return mevcut;
}

export async function editorListesi(kullanici) {
  const satirlar = await db.query.haberler.findMany({
    where: kullanici.rol === 'admin' ? undefined : eq(haberler.yazarId, kullanici.id),
    orderBy: [desc(haberler.guncelleme)],
    columns: LISTE_SUTUNLARI,
    with: { kategori: true, yazar: YAZAR_SUTUNLARI },
    limit: 100,
  });
  return satirlar.map((h) => haberDTO(h));
}

export async function zenginlestirmeKaydet(id, alanlar) {
  await db.update(haberler).set(alanlar).where(eq(haberler.id, id));
}

export { kullanicilar };
