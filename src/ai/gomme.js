// Gömme (embedding): metni anlamını temsil eden sabit uzunlukta bir vektöre çevirir.
// Benzer anlamlı metinlerin vektörleri birbirine yakındır → "benzer haberler", RAG.
//
// LLM yoksa yerel yedek: "özellik karma" (feature hashing) ile sözcüksel vektör.
// Türkçe eklemeli bir dil olduğundan kelimelerin ilk 5 harfi (F5 kök bulma) + harf üçlüleri kullanılır.
// Anlamsal değil sözcükseldir ama ek servis gerektirmez ve dersin akışını bozmaz.
import { config } from '../config.js';
import { GOMME_BOYUT } from '../db/schema.js';
import { gommeIste, llmKullanilabilir } from './llm.js';
import { logger } from '../lib/logger.js';

export const YEREL_MODEL = `yerel-f5-${GOMME_BOYUT}`;

const DURAK = new Set(
  've ile de da bu bir için olarak olan gibi daha çok en ki mi mu ne ama veya ya şu o her hem kadar sonra önce ise yer aldı ettı etti eden oldu olduğu olduğunu dedi'.split(' '),
);

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function normalize(v) {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

export function yerelGomme(metin, boyut = GOMME_BOYUT) {
  const v = new Array(boyut).fill(0);
  const kelimeler = (metin.toLocaleLowerCase('tr-TR').match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (k) => k.length > 1 && !DURAK.has(k),
  );
  const ekle = (ozellik, agirlik) => {
    const h = fnv1a(ozellik);
    v[h % boyut] += h & 0x80000000 ? -agirlik : agirlik; // işaret karması: çakışmaları dengeler
  };
  for (const k of kelimeler) {
    ekle(`k:${k.slice(0, 5)}`, 1);
    const p = `^${k}$`;
    for (let i = 0; i < p.length - 2; i++) ekle(`t:${p.slice(i, i + 3)}`, 0.35);
  }
  return normalize(v);
}

function boyutaUydur(v) {
  if (v.length === GOMME_BOYUT) return v;
  logger.warn({ gelen: v.length, beklenen: GOMME_BOYUT }, 'Gömme boyutu farklı; kırpılıyor/dolduruluyor');
  const k = v.slice(0, GOMME_BOYUT);
  while (k.length < GOMME_BOYUT) k.push(0);
  return normalize(k);
}

export function haberMetni(h) {
  return `${h.baslik}. ${h.spot}. ${h.icerik ?? ''}`.slice(0, 6000);
}

// Bir metin için vektör + hangi modelle üretildiği. Farklı modellerin vektörleri karşılaştırılamaz,
// bu yüzden model adı da saklanır ve aramalarda filtrelenir.
export async function gommeUret(metin) {
  if (llmKullanilabilir()) {
    try {
      const [v] = await gommeIste([metin]);
      return { vektor: boyutaUydur(v), model: config.EMBED_MODEL };
    } catch (err) {
      logger.warn({ err: err.message }, 'LLM gömme başarısız; yerel gömmeye geçildi');
    }
  }
  return { vektor: yerelGomme(metin), model: YEREL_MODEL };
}

// Sorgu vektörü, veritabanındaki vektörlerle aynı modelle üretilmeli.
export async function sorguGommesi(metin, model) {
  if (model === YEREL_MODEL || !model) return { vektor: yerelGomme(metin), model: YEREL_MODEL };
  return gommeUret(metin);
}
