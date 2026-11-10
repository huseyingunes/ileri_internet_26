// "10 saniyede haber" özeti — yapılandırılmış çıktı (structured output) ile.
// Model serbest metin değil, JSON Şemasına uyan nesne döndürür; zod ile yeniden doğrulanır.
import { z } from 'zod';
import { sohbet, llmKullanilabilir } from './llm.js';
import { cikarimsalOzet, kelimeSay, OZET_KELIME } from '../lib/metin.js';
import { logger } from '../lib/logger.js';

const OzetSemasi = z.object({
  ozet: z.string().min(10),
  etiketler: z.array(z.string()).min(1).max(6),
});

const JSON_SEMASI = {
  ad: 'haber_ozeti',
  sema: {
    type: 'object',
    additionalProperties: false,
    required: ['ozet', 'etiketler'],
    properties: {
      ozet: { type: 'string', description: `En fazla ${OZET_KELIME} kelimelik Türkçe özet` },
      etiketler: { type: 'array', items: { type: 'string' }, description: '3-5 kısa etiket, küçük harf' },
    },
  },
};

const SISTEM = `Sen haber10da.net'in kıdemli editörüsün. Görevin bir haberi okurun 10 saniyede okuyabileceği
şekilde özetlemek. Kurallar:
- En fazla ${OZET_KELIME} kelime, tek paragraf, Türkçe.
- Kim, ne, nerede, ne zaman sorularını yanıtla; yorum ve abartı ekleme.
- Haberde olmayan bilgi uydurma.
- 3-5 adet kısa, küçük harfli etiket üret.`;

const DURAK = new Set(
  've ile için olarak olan daha çok gibi kadar sonra önce bunun buna bu bir olduğu olduğunu ancak ayrıca yapılan yapılacak tarafından üzerinde arasında'.split(' '),
);

export function yerelEtiketler(metin, adet = 4) {
  const sayac = new Map();
  for (const k of metin.toLocaleLowerCase('tr-TR').match(/[\p{L}]{5,}/gu) ?? []) {
    if (DURAK.has(k)) continue;
    const kok = k.slice(0, 7);
    const kayit = sayac.get(kok) ?? { sayi: 0, kelime: k };
    kayit.sayi += 1;
    if (k.length < kayit.kelime.length) kayit.kelime = k;
    sayac.set(kok, kayit);
  }
  return [...sayac.values()]
    .filter((k) => k.sayi > 1)
    .sort((a, b) => b.sayi - a.sayi)
    .slice(0, adet)
    .map((k) => k.kelime);
}

export async function ozetUret({ baslik, spot, icerik }) {
  if (llmKullanilabilir()) {
    try {
      const mesaj = await sohbet({
        mesajlar: [
          { role: 'system', content: SISTEM },
          { role: 'user', content: `Başlık: ${baslik}\nSpot: ${spot}\n\nHaber metni:\n${icerik.slice(0, 8000)}` },
        ],
        sema: JSON_SEMASI,
        sicaklik: 0.2,
      });
      const veri = OzetSemasi.parse(JSON.parse(mesaj.content));
      let ozet = veri.ozet.trim();
      if (kelimeSay(ozet) > OZET_KELIME + 15) ozet = cikarimsalOzet(ozet);
      return {
        ozet,
        etiketler: veri.etiketler.map((e) => e.toLocaleLowerCase('tr-TR').trim()).slice(0, 5),
        kaynak: 'yz',
      };
    } catch (err) {
      logger.warn({ err: err.message }, 'YZ özeti üretilemedi; çıkarımsal özete geçildi');
    }
  }
  return {
    ozet: cikarimsalOzet(`${spot} ${icerik}`),
    etiketler: yerelEtiketler(`${baslik} ${spot} ${icerik}`),
    kaynak: 'cikarimsal',
  };
}
