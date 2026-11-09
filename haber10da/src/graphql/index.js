// GraphQL uç noktası — /graphql (tarayıcıda açınca GraphiQL arayüzü gelir).
// REST'ten farkı: istemci hangi alanları istediğini kendisi söyler, tek istekte iç içe veri alır.
//
//   query { haberler(ilk: 5) { baslik yazar { ad } kategori { ad } } }
//
// Tehlike: her haber için yazar çözümleyicisi ayrı sorgu atarsa N+1 oluşur.
// Çözüm: DataLoader — aynı tick içindeki tüm yazar istekleri toplanır, tek "WHERE id IN (...)" sorgusu atılır.
import { createSchema, createYoga } from 'graphql-yoga';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { kategoriler, kullanicilar } from '../db/schema.js';
import * as servis from '../servisler/haberServisi.js';
import { ara } from '../arama/index.js';

const typeDefs = /* GraphQL */ `
  type Kategori { id: Int!, ad: String!, slug: String!, renk: String! }
  type Yazar { id: Int!, ad: String!, avatar: String }
  type Haber {
    id: Int!
    slug: String!
    baslik: String!
    spot: String!
    ozet: String
    icerik: String
    etiketler: [String!]!
    okumaSuresi: Int!
    sonDakika: Boolean!
    yayinTarihi: String
    goruntulenme: Int!
    yazar: Yazar!
    kategori: Kategori!
  }
  type HaberSayfasi { haberler: [Haber!]!, toplam: Int!, sayfa: Int!, sayfaSayisi: Int! }
  type Query {
    haberler(kategori: String, sayfa: Int = 1, ilk: Int = 10): HaberSayfasi!
    haber(slug: String!): Haber
    kategoriler: [Kategori!]!
    ara(sorgu: String!): [Haber!]!
  }
`;

function yukleyiciler() {
  const toplu = (tablo) =>
    new DataLoader(async (idler) => {
      const satirlar = await db.select().from(tablo).where(inArray(tablo.id, idler));
      const harita = new Map(satirlar.map((s) => [s.id, s]));
      return idler.map((id) => harita.get(id) ?? null);
    });
  return { yazar: toplu(kullanicilar), kategori: toplu(kategoriler) };
}

// Ham satırı GraphQL nesnesine çevir: yazar/kategori çözümleyiciler id'den yükler.
const duz = (h) => ({ ...h, yazarId: h.yazarId ?? h.yazar?.id, kategoriId: h.kategoriId ?? h.kategori?.id });

const resolvers = {
  Query: {
    haberler: async (_, { kategori, sayfa, ilk }) => {
      const s = await servis.listele({ kategori, sayfa, limit: Math.min(ilk, 50) });
      return { ...s, haberler: s.haberler.map(duz) };
    },
    haber: async (_, { slug }) => {
      const h = await servis.getir(slug).catch(() => null);
      return h ? duz(h) : null;
    },
    kategoriler: () => servis.kategorileriGetir(),
    ara: async (_, { sorgu }) => (await ara(sorgu)).sonuclar.map(duz),
  },
  Haber: {
    yazar: (h, _, ctx) => ctx.yukle.yazar.load(h.yazarId),
    kategori: (h, _, ctx) => ctx.yukle.kategori.load(h.kategoriId),
    yayinTarihi: (h) => (h.yayinTarihi ? new Date(h.yayinTarihi).toISOString() : null),
  },
};

export const graphqlUygulamasi = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/graphql',
  context: () => ({ yukle: yukleyiciler() }), // her istek için yeni yükleyici (önbellek sızmasın)
  landingPage: false,
  maskedErrors: true,
});
