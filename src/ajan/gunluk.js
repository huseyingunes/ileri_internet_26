// haber10da günlük haber ajanı
//
//   npm run ajan            → bir kez çalışır (Görev Zamanlayıcı her gün bunu çağırır)
//   npm run ajan -- --dene  → hiçbir şey yazmadan ne yapacağını gösterir
//
// Adımlar:
//   1. Sunucuyu denetle; localhost'ta kapalıysa kendisi başlatır, iş bitince kapatır.
//   2. Editör hesabıyla API'ye giriş yapar (ajan veritabanına doğrudan yazmaz).
//   3. ajan/kaynaklar.json'daki RSS kaynaklarını okur; son 48 saatin daha önce alınmamış haberlerini toplar.
//   4. Benzer başlıkları eler, kategorileri dengeleyerek AJAN_ADET kadar haber seçer.
//   5. Dil modeli varsa her haberi yalnızca kaynak metindeki bilgilerle, kendi cümleleriyle yeniden yazar
//      (yapılandırılmış çıktı). Yoksa kaynağın kendi başlık ve açıklamasını kullanır.
//   6. POST /api/editor/haberler ile ekler, AJAN_YAYINLA=evet ise yayımlar. Kaynak adı ve bağlantısı habere eklenir.
//   7. Alınan bağlantıları .veri/ajan-gecmis.json'a yazar; aynı haber ikinci kez girilmez.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { config } from '../config.js';
import { rssGetir } from '../lib/rss.js';
import { cumlelereBol, kelimeSay, OZET_KELIME } from '../lib/metin.js';
import { sohbet, llmKullanilabilir } from '../ai/llm.js';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const KATEGORILER = ['gundem', 'kampus', 'teknoloji', 'ekonomi', 'spor', 'kultur-sanat', 'balikesir'];
const ENAZ_KAYNAK_METNI = 60; // karakter: daha kısa açıklamalardan haber yazılmaz (uydurmaya zorlar)

export const yaz = (...m) => console.log(new Date().toLocaleTimeString('tr-TR'), ...m);

/* ---------------- Yardımcılar ---------------- */

function gecmisOku(dosya) {
  try {
    return new Set(JSON.parse(readFileSync(dosya, 'utf8')));
  } catch {
    return new Set();
  }
}

function gecmisYaz(dosya, kume) {
  mkdirSync(path.dirname(dosya), { recursive: true });
  writeFileSync(dosya, JSON.stringify([...kume].slice(-3000), null, 0));
}

const kelimeler = (s) => new Set((s.toLocaleLowerCase('tr-TR').match(/[\p{L}\p{N}]{3,}/gu) ?? []).map((k) => k.slice(0, 6)));
function benzerlik(a, b) {
  const x = kelimeler(a);
  const y = kelimeler(b);
  const ortak = [...x].filter((k) => y.has(k)).length;
  return ortak / (Math.min(x.size, y.size) || 1);
}

export function api(taban, belirtec) {
  return async (yol, { yontem = 'GET', govde } = {}) => {
    const yanit = await fetch(`${taban}${yol}`, {
      method: yontem,
      headers: {
        'content-type': 'application/json',
        origin: taban, // CSRF denetimi Origin'e bakar
        ...(belirtec.deger ? { authorization: `Bearer ${belirtec.deger}` } : {}),
      },
      body: govde ? JSON.stringify(govde) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    const veri = yanit.status === 204 ? null : await yanit.json().catch(() => null);
    if (!yanit.ok) {
      const hata = new Error(veri?.detail ?? `${yontem} ${yol} → ${yanit.status}`);
      hata.durum = yanit.status;
      hata.alanlar = veri?.alanlar;
      throw hata;
    }
    return veri;
  };
}

async function sunucuAyakta(taban) {
  try {
    return (await fetch(`${taban}/api/saglik`, { signal: AbortSignal.timeout(3000) })).ok;
  } catch {
    return false;
  }
}

// localhost'taki sunucu kapalıysa geçici olarak başlat
export async function sunucuyuGarantile(taban) {
  if (await sunucuAyakta(taban)) return null;
  const url = new URL(taban);
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error(`${taban} adresindeki sunucuya ulaşılamıyor.`);
  }
  yaz(`Sunucu kapalı; ${taban} adresinde geçici olarak başlatılıyor…`);
  const surec = spawn(process.execPath, [path.join(KOK, 'src/server.js')], {
    cwd: KOK,
    env: { ...process.env, PORT: url.port || '80', LOG_LEVEL: 'warn' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await sunucuAyakta(taban)) return surec;
  }
  surec.kill();
  throw new Error('Sunucu 30 saniyede açılmadı.');
}

/* ---------------- Toplama ve seçim ---------------- */

export async function adaylariTopla(kaynaklar, { gecmis, simdi = Date.now(), getir = rssGetir }) {
  const adaylar = [];
  const hatalar = [];
  for (const k of kaynaklar.filter((x) => x.aktif !== false)) {
    try {
      const ogeler = await getir(k.url);
      for (const o of ogeler) {
        if (!/^https?:\/\//.test(o.baglanti ?? '')) continue;
        if (gecmis.has(o.baglanti)) continue;
        if (simdi - o.tarih.getTime() > 48 * 3600_000) continue;
        if (!o.baslik || o.aciklama.length < ENAZ_KAYNAK_METNI) continue;
        adaylar.push({ ...o, kategori: k.kategori, kaynakAd: k.ad });
      }
    } catch (err) {
      hatalar.push(`${k.ad} (${k.kategori}): ${err.cause?.code ?? err.cause?.message ?? err.message}`);
    }
  }
  return { adaylar, hatalar };
}

// Kategoriler arasında sırayla, her kategoride en yeniden başlayarak seç; benzer başlıkları atla.
export function sec(adaylar, adet) {
  const gruplar = new Map();
  for (const a of [...adaylar].sort((x, y) => y.tarih - x.tarih)) {
    if (!gruplar.has(a.kategori)) gruplar.set(a.kategori, []);
    gruplar.get(a.kategori).push(a);
  }
  const secilen = [];
  while (secilen.length < adet && [...gruplar.values()].some((g) => g.length)) {
    for (const g of gruplar.values()) {
      if (secilen.length >= adet) break;
      while (g.length) {
        const a = g.shift();
        if (secilen.some((s) => benzerlik(s.baslik, a.baslik) > 0.6)) continue;
        secilen.push(a);
        break;
      }
    }
  }
  return secilen;
}

/* ---------------- Yazım ---------------- */

const YazimSemasi = z.object({
  baslik: z.string(),
  spot: z.string(),
  icerik: z.string(),
  ozet: z.string(),
  etiketler: z.array(z.string()),
  kategori: z.enum(KATEGORILER),
});

const JSON_SEMASI = {
  ad: 'haber10da_haberi',
  sema: {
    type: 'object',
    additionalProperties: false,
    required: ['baslik', 'spot', 'icerik', 'ozet', 'etiketler', 'kategori'],
    properties: {
      baslik: { type: 'string', description: 'En fazla 90 karakter' },
      spot: { type: 'string', description: 'Tek cümlelik giriş' },
      icerik: { type: 'string', description: '2-3 kısa paragraf, paragraflar arasında boş satır' },
      ozet: { type: 'string', description: `En fazla ${OZET_KELIME} kelime` },
      etiketler: { type: 'array', items: { type: 'string' } },
      kategori: { type: 'string', enum: KATEGORILER },
    },
  },
};

const SISTEM = `Sen haber10da.net'in haber editörüsün. Sana bir haber kaynağının RSS kaydı (başlık ve kısa açıklama) verilecek.
Bu bilgiden haber10da için kısa ve özgün bir haber yaz.
Kurallar:
- YALNIZCA verilen metindeki bilgileri kullan. Tarih, sayı, kişi adı, kurum adı, alıntı ya da ayrıntı UYDURMA.
- Kaynak cümleleri kopyalama; aynı bilgiyi kendi cümlelerinle, akıcı ve doğru bir Türkçeyle anlat.
- Başlık en fazla 90 karakter, abartısız. Spot tek cümle.
- İçerik 2-3 kısa paragraf. Bilgi azsa kısa tut; dolgu cümlesi, yorum ya da tahmin ekleme.
- Özet en fazla ${OZET_KELIME} kelime, okur 10 saniyede okuyabilmeli.
- 3-5 küçük harfli etiket. Kategoriyi listeden seç.`;

function kaynaktanHaber(a) {
  const cumleler = cumlelereBol(a.aciklama);
  return {
    baslik: a.baslik.slice(0, 160),
    spot: (cumleler[0] ?? a.aciklama).slice(0, 320),
    icerik: a.aciklama,
    ozet: null,
    etiketler: [],
    kategori: a.kategori,
    yazim: 'kaynak',
  };
}

export async function haberYaz(a) {
  const yedek = kaynaktanHaber(a);
  if (!llmKullanilabilir()) return yedek;
  try {
    const mesaj = await sohbet({
      mesajlar: [
        { role: 'system', content: SISTEM },
        {
          role: 'user',
          content: `Kaynak: ${a.kaynakAd}\nÖnerilen kategori: ${a.kategori}\nYayın zamanı: ${a.tarih.toISOString()}\n\nBaşlık: ${a.baslik}\n\nAçıklama: ${a.aciklama.slice(0, 3000)}`,
        },
      ],
      sema: JSON_SEMASI,
      sicaklik: 0.3,
      azamiToken: 1200,
    });
    const v = YazimSemasi.parse(JSON.parse(mesaj.content));
    // API sınırlarına uymayan alanlarda kaynağın kendi metnine dön
    return {
      baslik: v.baslik.trim().length >= 10 ? v.baslik.trim().slice(0, 160) : yedek.baslik,
      spot: v.spot.trim().length >= 20 ? v.spot.trim().slice(0, 320) : yedek.spot,
      icerik: v.icerik.trim().length >= 50 ? v.icerik.trim() : yedek.icerik,
      ozet: kelimeSay(v.ozet) <= OZET_KELIME + 10 ? v.ozet.trim().slice(0, 400) : null,
      etiketler: v.etiketler.map((e) => e.toLocaleLowerCase('tr-TR').trim()).filter((e) => e.length >= 2 && e.length <= 30).slice(0, 5),
      kategori: v.kategori,
      yazim: 'yz',
    };
  } catch (err) {
    yaz(`  ! Dil modeli yazamadı (${err.message.slice(0, 80)}); kaynağın metni kullanılıyor.`);
    return yedek;
  }
}

/* ---------------- Ana akış ---------------- */

export async function ajanCalistir({
  taban = (config.AJAN_API || `http://localhost:${config.PORT}`).replace(/\/$/, ''),
  eposta = config.AJAN_EPOSTA,
  parola = config.AJAN_PAROLA,
  adet = config.AJAN_ADET,
  yayinla = config.AJAN_YAYINLA === 'evet',
  kaynakDosyasi = path.join(KOK, 'ajan/kaynaklar.json'),
  gecmisDosyasi = path.join(KOK, '.veri/ajan-gecmis.json'),
  dene = false,
  getir,
} = {}) {
  const rapor = { eklenen: [], atlanan: [], hatalar: [] };
  if (!parola) {
    throw new Error('AJAN_PAROLA tanımlı değil. Önce "npm run ajan:hesap" komutunu çalıştırın.');
  }
  const gecici = await sunucuyuGarantile(taban);
  try {
    const belirtec = { deger: null };
    const istek = api(taban, belirtec);
    belirtec.deger = (await istek('/api/auth/giris', { yontem: 'POST', govde: { eposta, parola } })).erisim;
    const katId = Object.fromEntries((await istek('/api/kategoriler')).map((k) => [k.slug, k.id]));

    const { kaynaklar } = JSON.parse(readFileSync(kaynakDosyasi, 'utf8'));
    const gecmis = gecmisOku(gecmisDosyasi);
    const { adaylar, hatalar } = await adaylariTopla(kaynaklar, { gecmis, getir });
    rapor.hatalar.push(...hatalar);
    const secilen = sec(adaylar, adet);
    yaz(`${kaynaklar.length} kaynaktan ${adaylar.length} yeni aday bulundu, ${secilen.length} haber seçildi.`);
    yaz(`Yazım: ${llmKullanilabilir() ? `dil modeli (${config.LLM_MODEL})` : 'dil modeli yok, kaynak metni kullanılacak'}`);

    for (const a of secilen) {
      const h = await haberYaz(a);
      if (dene) {
        yaz(`  [deneme] ${h.kategori} | ${h.baslik}`);
        continue;
      }
      try {
        const kayit = await istek('/api/editor/haberler', {
          yontem: 'POST',
          govde: {
            baslik: h.baslik,
            spot: h.spot,
            icerik: h.icerik,
            kategoriId: katId[h.kategori] ?? katId[a.kategori] ?? katId.gundem,
            ozet: h.ozet,
            ozetKaynak: h.ozet ? 'yz' : undefined,
            etiketler: h.etiketler,
            kaynakAd: a.kaynakAd,
            kaynakUrl: a.baglanti,
          },
        });
        if (yayinla) await istek(`/api/editor/haberler/${kayit.id}/yayinla`, { yontem: 'POST' });
        gecmis.add(a.baglanti);
        rapor.eklenen.push({ baslik: h.baslik, kategori: h.kategori, yazim: h.yazim, slug: kayit.slug });
        yaz(`  + ${yayinla ? 'yayımlandı' : 'taslak'} | ${h.kategori} | ${h.baslik}`);
      } catch (err) {
        if (err.durum === 409) {
          gecmis.add(a.baglanti);
          rapor.atlanan.push(a.baslik);
          continue;
        }
        const ayrinti = err.alanlar?.map((x) => `${x.alan}: ${x.mesaj}`).join(', ');
        rapor.hatalar.push(`${a.baslik}: ${err.message}${ayrinti ? ` (${ayrinti})` : ''}`);
      }
    }
    if (!dene) gecmisYaz(gecmisDosyasi, gecmis);

    // Sunucuyu ajan başlattıysa, kapatmadan önce arka plan işlerinin (özet, gömme) bitmesini bekle
    if (gecici && rapor.eklenen.length) {
      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const durum = await istek('/api/sistem/durum').catch(() => null);
        if (durum?.bilesenler?.kuyruk?.bekleyen === 0) break;
      }
    }
  } finally {
    gecici?.kill();
  }
  yaz(`Bitti: ${rapor.eklenen.length} haber eklendi, ${rapor.atlanan.length} zaten vardı, ${rapor.hatalar.length} hata.`);
  for (const h of rapor.hatalar) yaz(`  ! ${h}`);
  return rapor;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const rapor = await ajanCalistir({ dene: process.argv.includes('--dene') });
    process.exit(rapor.eklenen.length || !rapor.hatalar.length ? 0 : 1);
  } catch (err) {
    yaz(`HATA: ${err.message}`);
    process.exit(1);
  }
}

