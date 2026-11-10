// Arama motoru katmanı.
//   ELASTIC_URL yoksa  → PostgreSQL tam metin arama (tsvector + GIN indeksi, Türkçe kök bulma)
//   ELASTIC_URL varsa  → Elasticsearch (Türkçe çözümleyici, alan ağırlıkları, vurgulama)
// Vurgu işaretleri ⟦ ⟧ ile döner; ön yüz önce metni kaçışlar (XSS), sonra <mark> ekler.
import { and, eq, inArray, sql } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { haberler } from '../db/schema.js';
import { haberDTO, vektorleAra } from '../servisler/haberServisi.js';
import { sorguGommesi, YEREL_MODEL } from '../ai/gomme.js';
import { logger } from '../lib/logger.js';

const ACIK = '⟦';
const KAPALI = '⟧';
const ES_INDEKS = 'haber10da-haberler';

export const aramaMotoru = () => (config.ELASTIC_URL ? 'elasticsearch' : 'postgresql');

const ftsVektoru = sql`to_tsvector('turkish', ${haberler.baslik} || ' ' || ${haberler.spot} || ' ' || ${haberler.icerik})`;

async function haberleriGetir(idler) {
  if (!idler.length) return new Map();
  const satirlar = await db.query.haberler.findMany({
    where: and(inArray(haberler.id, idler), eq(haberler.durum, 'yayinda')),
    columns: { icerik: false, gomme: false },
    with: { kategori: true, yazar: { columns: { id: true, ad: true, avatar: true } } },
  });
  return new Map(satirlar.map((h) => [h.id, h]));
}

async function pgAra(q, { limit, offset }) {
  const sorgu = sql`websearch_to_tsquery('turkish', ${q})`;
  const kosul = and(eq(haberler.durum, 'yayinda'), sql`${ftsVektoru} @@ ${sorgu}`);
  const [satirlar, [{ toplam }]] = await Promise.all([
    db
      .select({
        id: haberler.id,
        puan: sql`ts_rank(${ftsVektoru}, ${sorgu})`.as('puan'),
        vurgu: sql`ts_headline('turkish', ${haberler.spot} || ' ' || ${haberler.icerik}, ${sorgu},
          ${`StartSel=${ACIK}, StopSel=${KAPALI}, MaxWords=32, MinWords=14, MaxFragments=1`})`,
      })
      .from(haberler)
      .where(kosul)
      .orderBy(sql`puan DESC`)
      .limit(limit)
      .offset(offset),
    db.select({ toplam: sql`count(*)::int` }).from(haberler).where(kosul),
  ]);
  return { satirlar, toplam };
}

async function es(yol, govde, yontem = 'POST') {
  const yanit = await fetch(`${config.ELASTIC_URL.replace(/\/$/, '')}${yol}`, {
    method: yontem,
    headers: { 'content-type': 'application/json' },
    body: govde ? JSON.stringify(govde) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  if (!yanit.ok && yanit.status !== 404) throw new Error(`Elasticsearch ${yanit.status}: ${await yanit.text()}`);
  return yanit.status === 404 ? null : yanit.json();
}

export async function esIndeksHazirla() {
  if (!config.ELASTIC_URL) return;
  const var_ = await fetch(`${config.ELASTIC_URL}/${ES_INDEKS}`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
  if (var_) return;
  await es(
    `/${ES_INDEKS}`,
    {
      settings: { analysis: { analyzer: { tr: { type: 'turkish' } } } },
      mappings: {
        properties: {
          baslik: { type: 'text', analyzer: 'tr' },
          spot: { type: 'text', analyzer: 'tr' },
          icerik: { type: 'text', analyzer: 'tr' },
          etiketler: { type: 'keyword' },
          kategori: { type: 'keyword' },
          yayinTarihi: { type: 'date' },
        },
      },
    },
    'PUT',
  );
  logger.info('Elasticsearch indeksi oluşturuldu');
}

async function esAra(q, { limit, offset }) {
  const sonuc = await es(`/${ES_INDEKS}/_search`, {
    from: offset,
    size: limit,
    query: { multi_match: { query: q, fields: ['baslik^3', 'spot^2', 'icerik', 'etiketler^2'], fuzziness: 'AUTO' } },
    highlight: { pre_tags: [ACIK], post_tags: [KAPALI], fields: { icerik: { fragment_size: 180, number_of_fragments: 1 }, spot: {} } },
  });
  const satirlar = (sonuc?.hits?.hits ?? []).map((h) => ({
    id: Number(h._id),
    puan: h._score,
    vurgu: h.highlight?.icerik?.[0] ?? h.highlight?.spot?.[0] ?? null,
  }));
  return { satirlar, toplam: sonuc?.hits?.total?.value ?? 0 };
}

export async function ara(q, { sayfa = 1, limit = 10 } = {}) {
  const ayar = { limit, offset: (sayfa - 1) * limit };
  let motor = aramaMotoru();
  let sonuc;
  try {
    sonuc = motor === 'elasticsearch' ? await esAra(q, ayar) : await pgAra(q, ayar);
  } catch (err) {
    logger.warn({ err: err.message }, 'Elasticsearch yanıt vermedi; PostgreSQL aramasına geçildi');
    motor = 'postgresql';
    sonuc = await pgAra(q, ayar);
  }
  const harita = await haberleriGetir(sonuc.satirlar.map((s) => s.id));
  return {
    sorgu: q,
    motor,
    toplam: sonuc.toplam,
    sayfa,
    sonuclar: sonuc.satirlar
      .filter((s) => harita.has(s.id))
      .map((s) => ({ ...haberDTO(harita.get(s.id)), vurgu: s.vurgu, puan: Number(s.puan) })),
  };
}

export async function indeksle(h) {
  if (!config.ELASTIC_URL) return; // PostgreSQL indeksi veriyle birlikte otomatik güncellenir
  await es(`/${ES_INDEKS}/_doc/${h.id}`, {
    baslik: h.baslik,
    spot: h.spot,
    icerik: h.icerik,
    etiketler: h.etiketler,
    kategori: h.kategori?.slug,
    yayinTarihi: h.yayinTarihi,
  }, 'PUT');
}

export async function indekstenSil(id) {
  if (!config.ELASTIC_URL) return;
  await es(`/${ES_INDEKS}/_doc/${id}`, null, 'DELETE');
}

// Hibrit arama (RAG için): tam metin + vektör sonuçlarını "karşılıklı sıra füzyonu" (RRF) ile birleştirir.
// RRF puanı = Σ 1 / (60 + sıra). Farklı ölçeklerdeki puanları normalize etmeden birleştirmenin yolu.
export async function hibritAra(q, adet = 5) {
  // Doğal dil sorularında tüm kelimeler aynı haberde geçmez: kelimeleri VEYA ile bağla
  const veyaSorgu = (q.match(/[\p{L}\p{N}]{3,}/gu) ?? [q]).join(' or ');
  const [metin, model] = await Promise.all([
    ara(veyaSorgu, { limit: adet * 2 }).catch(() => ({ sonuclar: [] })),
    db
      .select({ model: haberler.gommeModel })
      .from(haberler)
      .where(sql`${haberler.gommeModel} IS NOT NULL`)
      .limit(1)
      .then((r) => r[0]?.model ?? YEREL_MODEL),
  ]);
  const { vektor, model: kullanilan } = await sorguGommesi(q, model);
  // Yerel (sözcüksel) gömmelerde düşük benzerlik gürültüdür; eşik altını at
  const esik = kullanilan === YEREL_MODEL ? 0.3 : 0.2;
  const vektorel = (await vektorleAra(vektor, kullanilan, { adet: adet * 2 })).filter((h) => h.benzerlik >= esik);

  const puan = new Map();
  const kayit = new Map();
  const isle = (liste) =>
    liste.forEach((h, sira) => {
      puan.set(h.id, (puan.get(h.id) ?? 0) + 1 / (60 + sira + 1));
      if (!kayit.has(h.id)) kayit.set(h.id, h);
    });
  isle(metin.sonuclar);
  isle(vektorel);
  return [...puan.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, adet)
    .map(([id]) => kayit.get(id));
}
