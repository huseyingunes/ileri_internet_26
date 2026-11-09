// "Haberlere sor" asistanı — RAG + fonksiyon çağırma (tool calling) + akışlı yanıt.
//
//  1. Kullanıcı sorusu modele araç tanımlarıyla birlikte gönderilir.
//  2. Model gerekirse haber_ara / son_haberler araçlarını çağırır (JSON argümanlarla).
//  3. Araçları biz çalıştırırız (hibrit arama → veritabanı), sonucu modele geri veririz.
//  4. Model, yalnızca bu kaynaklara dayanarak yanıtı parça parça (stream) üretir.
import { z } from 'zod';
import { sohbetAkisi, llmKullanilabilir } from './llm.js';
import { hibritAra } from '../arama/index.js';
import { listele } from '../servisler/haberServisi.js';
import { logger } from '../lib/logger.js';

const SISTEM = `Sen haber10da.net'in haber asistanısın. Okurun sorularını YALNIZCA araçlardan gelen
haberlere dayanarak, kısa ve açık Türkçe ile yanıtla.
- Önce uygun aracı çağırarak ilgili haberleri bul.
- Kullandığın her bilginin sonuna kaynak haberin numarasını [1] biçiminde ekle.
- Haberlerde yanıt yoksa bunu açıkça söyle; tahmin yürütme, bilgi uydurma.`;

const ARACLAR = [
  {
    type: 'function',
    function: {
      name: 'haber_ara',
      description: 'haber10da arşivinde konuya göre haber arar (anlamsal + tam metin hibrit arama).',
      parameters: {
        type: 'object',
        properties: {
          sorgu: { type: 'string', description: 'Aranacak konu, anahtar kelimeler' },
          adet: { type: 'integer', minimum: 1, maximum: 8, default: 5 },
        },
        required: ['sorgu'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'son_haberler',
      description: 'En son yayımlanan haberleri getirir; isteğe bağlı kategori süzgeci.',
      parameters: {
        type: 'object',
        properties: {
          kategori: { type: 'string', enum: ['gundem', 'kampus', 'teknoloji', 'ekonomi', 'spor', 'kultur-sanat', 'balikesir'] },
          adet: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
        },
      },
    },
  },
];

const AramaArg = z.object({ sorgu: z.string().min(1), adet: z.number().int().min(1).max(8).default(5) });
const SonArg = z.object({ kategori: z.string().optional(), adet: z.number().int().min(1).max(10).default(5) });

function kaynakMetni(haberler, baslangic) {
  return haberler
    .map((h, i) => `[${baslangic + i}] ${h.baslik} (${h.kategori?.ad}, ${new Date(h.yayinTarihi).toLocaleDateString('tr-TR')})\n${h.ozet ?? h.spot}`)
    .join('\n\n');
}

async function araciCalistir(ad, hamArg) {
  const arg = JSON.parse(hamArg || '{}');
  if (ad === 'haber_ara') {
    const { sorgu, adet } = AramaArg.parse(arg);
    return hibritAra(sorgu, adet);
  }
  if (ad === 'son_haberler') {
    const { kategori, adet } = SonArg.parse(arg);
    return (await listele({ kategori, limit: adet })).haberler;
  }
  throw new Error(`Bilinmeyen araç: ${ad}`);
}

const kaynakOzet = (h, no) => ({ no, slug: h.slug, baslik: h.baslik, kategori: h.kategori?.ad });

// yaz(olay, veri): SSE olayı gönderir — 'arac', 'kaynak', 'parca', 'bitti', 'hata'
export async function sor(soru, yaz) {
  const kaynaklar = [];

  if (!llmKullanilabilir()) {
    const bulunan = await hibritAra(soru, 4);
    bulunan.forEach((h) => kaynaklar.push(h));
    yaz('arac', { ad: 'haber_ara', arg: { sorgu: soru }, sonuc: bulunan.length });
    yaz('kaynak', kaynaklar.map((h, i) => kaynakOzet(h, i + 1)));
    yaz('parca', {
      metin: bulunan.length
        ? 'Yapay zekâ modeli şu an bağlı değil; sorunuzla en ilgili haberleri listeledim:\n\n' +
          bulunan.map((h, i) => `[${i + 1}] ${h.baslik} — ${h.ozet ?? h.spot}`).join('\n\n')
        : 'Yapay zekâ modeli şu an bağlı değil ve arşivde bu soruyla eşleşen haber bulunamadı.',
    });
    yaz('bitti', { mod: 'yedek' });
    return;
  }

  const mesajlar = [
    { role: 'system', content: SISTEM },
    { role: 'user', content: soru },
  ];

  for (let tur = 0; tur < 4; tur++) {
    let aracCagrilari = null;
    let metin = '';
    for await (const olay of sohbetAkisi({ mesajlar, araclar: ARACLAR })) {
      if (olay.tur === 'metin') {
        metin += olay.metin;
        yaz('parca', { metin: olay.metin });
      } else if (olay.tur === 'araclar') {
        aracCagrilari = olay.araclar;
      }
    }
    if (!aracCagrilari?.length) {
      yaz('bitti', { mod: 'yz' });
      return;
    }
    mesajlar.push({ role: 'assistant', content: metin || null, tool_calls: aracCagrilari });
    for (const cagri of aracCagrilari) {
      let icerik;
      try {
        const sonuc = await araciCalistir(cagri.function.name, cagri.function.arguments);
        const yeni = sonuc.filter((h) => !kaynaklar.some((k) => k.id === h.id));
        const baslangic = kaynaklar.length + 1;
        kaynaklar.push(...yeni);
        yaz('arac', { ad: cagri.function.name, arg: JSON.parse(cagri.function.arguments || '{}'), sonuc: sonuc.length });
        yaz('kaynak', kaynaklar.map((h, i) => kaynakOzet(h, i + 1)));
        icerik = yeni.length ? kaynakMetni(yeni, baslangic) : 'Yeni sonuç yok (bulunanlar zaten listede).';
      } catch (err) {
        logger.warn({ err: err.message }, 'Araç çalıştırılamadı');
        icerik = `Araç hatası: ${err.message}`;
      }
      mesajlar.push({ role: 'tool', tool_call_id: cagri.id, content: icerik });
    }
  }
  yaz('bitti', { mod: 'yz', not: 'azami araç turu' });
}
