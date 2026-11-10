// Veritabanı şeması — Drizzle ORM. Tablolar 3. normal forma (3NF) göre ayrıldı:
// yazar ve kategori bilgisi habere kopyalanmaz, yabancı anahtar ile bağlanır.
import { sql, relations } from 'drizzle-orm';
import {
  pgTable, pgEnum, serial, text, integer, boolean, timestamp, index, uniqueIndex, vector,
} from 'drizzle-orm/pg-core';

export const rolEnum = pgEnum('rol', ['okur', 'editor', 'admin']);
export const durumEnum = pgEnum('haber_durum', ['taslak', 'yayinda']);
export const ozetKaynakEnum = pgEnum('ozet_kaynak', ['editor', 'yz', 'cikarimsal']);

export const kullanicilar = pgTable('kullanicilar', {
  id: serial('id').primaryKey(),
  eposta: text('eposta').notNull().unique(),
  ad: text('ad').notNull(),
  parolaOzeti: text('parola_ozeti'), // bcrypt özeti; OAuth kullanıcılarında boş
  rol: rolEnum('rol').notNull().default('okur'),
  githubId: text('github_id').unique(),
  avatar: text('avatar'),
  olusturma: timestamp('olusturma', { withTimezone: true }).notNull().defaultNow(),
});

export const kategoriler = pgTable('kategoriler', {
  id: serial('id').primaryKey(),
  ad: text('ad').notNull(),
  slug: text('slug').notNull().unique(),
  renk: text('renk').notNull().default('#2B3FE0'),
  sira: integer('sira').notNull().default(0),
});

// Gömme vektör boyutu göç oluşturulurken sabitlenir (EMBED_BOYUT ile aynı olmalı).
export const GOMME_BOYUT = 768;

export const haberler = pgTable(
  'haberler',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull(),
    baslik: text('baslik').notNull(),
    spot: text('spot').notNull(),
    icerik: text('icerik').notNull(),
    ozet: text('ozet'),
    ozetKaynak: ozetKaynakEnum('ozet_kaynak'),
    etiketler: text('etiketler').array().notNull().default(sql`'{}'::text[]`),
    okumaSuresi: integer('okuma_suresi').notNull().default(60), // saniye
    kategoriId: integer('kategori_id').notNull().references(() => kategoriler.id),
    yazarId: integer('yazar_id').notNull().references(() => kullanicilar.id),
    durum: durumEnum('durum').notNull().default('taslak'),
    sonDakika: boolean('son_dakika').notNull().default(false),
    ornek: boolean('ornek').notNull().default(false), // kurgusal örnek içerik işareti
    kaynakAd: text('kaynak_ad'),
    kaynakUrl: text('kaynak_url'),
    goruntulenme: integer('goruntulenme').notNull().default(0),
    gomme: vector('gomme', { dimensions: GOMME_BOYUT }),
    gommeModel: text('gomme_model'),
    yayinTarihi: timestamp('yayin_tarihi', { withTimezone: true }),
    guncelleme: timestamp('guncelleme', { withTimezone: true }).notNull().defaultNow(),
    olusturma: timestamp('olusturma', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('haberler_slug_idx').on(t.slug),
    uniqueIndex('haberler_kaynak_url_idx').on(t.kaynakUrl),
    // Anasayfa sorgusu: WHERE durum='yayinda' ORDER BY yayin_tarihi DESC — bileşik indeks
    index('haberler_durum_tarih_idx').on(t.durum, t.yayinTarihi.desc()),
    index('haberler_kategori_idx').on(t.kategoriId),
    index('haberler_yazar_idx').on(t.yazarId),
    // Tam metin arama: Türkçe kök bulma (kitapları → kitap) için ifade indeksi (GIN)
    index('haberler_fts_idx').using(
      'gin',
      sql`to_tsvector('turkish', ${t.baslik} || ' ' || ${t.spot} || ' ' || ${t.icerik})`,
    ),
    // Vektör benzerliği için HNSW indeksi (kosinüs uzaklığı)
    index('haberler_gomme_idx').using('hnsw', t.gomme.op('vector_cosine_ops')),
  ],
);

// Yenileme belirteçleri: döndürme (rotation) + yeniden kullanım tespiti için saklanır.
export const yenilemeBelirtecleri = pgTable(
  'yenileme_belirtecleri',
  {
    id: text('id').primaryKey(), // jti
    kullaniciId: integer('kullanici_id').notNull().references(() => kullanicilar.id, { onDelete: 'cascade' }),
    aile: text('aile').notNull(), // aynı oturumdan türeyen belirteçler zinciri
    sonKullanma: timestamp('son_kullanma', { withTimezone: true }).notNull(),
    kullanildi: boolean('kullanildi').notNull().default(false),
    iptal: boolean('iptal').notNull().default(false),
    olusturma: timestamp('olusturma', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('yenileme_kullanici_idx').on(t.kullaniciId), index('yenileme_aile_idx').on(t.aile)],
);

export const kullaniciIliskileri = relations(kullanicilar, ({ many }) => ({ haberler: many(haberler) }));
export const kategoriIliskileri = relations(kategoriler, ({ many }) => ({ haberler: many(haberler) }));
export const haberIliskileri = relations(haberler, ({ one }) => ({
  yazar: one(kullanicilar, { fields: [haberler.yazarId], references: [kullanicilar.id] }),
  kategori: one(kategoriler, { fields: [haberler.kategoriId], references: [kategoriler.id] }),
}));
