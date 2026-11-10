// Günlük haber ajanı: sahte RSS kaynakları + gerçek API (rastgele portta) + isteğe bağlı sahte dil modeli.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { uygulamaHazirla, kapat } from '../yardimci/hazirla.js';
import { config } from '../../src/config.js';
import { llmDevresi } from '../../src/ai/llm.js';
import { ajanCalistir, sec } from '../../src/ajan/gunluk.js';

let app;
let sunucu;
let taban;
let llm;
const klasor = mkdtempSync(path.join(tmpdir(), 'ajan-'));
const kaynakDosyasi = path.join(klasor, 'kaynaklar.json');
const simdi = Date.now();

const KONULAR = ['', 'Belediye yeni park açtı', 'Kütüphane saatleri uzatıldı', 'Eski köprü yıkılacak', 'Takım finale yükseldi',
  'Maç ertelendi', 'Konser takvimi açıklandı', 'Yüzücü rekor kırdı', 'Sergi kapılarını açtı', 'Yeni otobüs hattı başladı'];
const oge = (n, kategori, saatOnce = 1) => ({
  kategori,
  baslik: `${KONULAR[n]} (haberi ${n})`,
  baglanti: `https://kaynak.example/${kategori}/${n}`,
  aciklama: `Bu, ${kategori} kategorisindeki ${n} numaralı örnek haberin açıklamasıdır. Açıklama ajanın haber yazabilmesi için yeterli uzunluktadır.`,
  tarih: new Date(simdi - saatOnce * 3600_000),
});

const AKISLAR = {
  'https://a.example/gundem': [oge(1, 'gundem'), oge(2, 'gundem'), oge(3, 'gundem', 72)], // 3. haber eski
  'https://a.example/spor': [oge(4, 'spor'), { ...oge(5, 'spor'), aciklama: 'kısa' }], // 5. haberin metni yetersiz
  'https://a.example/bozuk': null,
};
const getir = async (url) => {
  if (!AKISLAR[url]) throw new Error('HTTP 404');
  return AKISLAR[url];
};

beforeAll(async () => {
  app = await uygulamaHazirla();
  sunucu = http.createServer(app);
  await new Promise((r) => sunucu.listen(0, '127.0.0.1', r));
  taban = `http://127.0.0.1:${sunucu.address().port}`;
  config.corsKaynaklari.push(taban); // ajan Origin başlığı gönderir
  writeFileSync(
    kaynakDosyasi,
    JSON.stringify({
      kaynaklar: [
        { ad: 'Örnek Gündem', url: 'https://a.example/gundem', kategori: 'gundem' },
        { ad: 'Örnek Spor', url: 'https://a.example/spor', kategori: 'spor' },
        { ad: 'Bozuk Kaynak', url: 'https://a.example/bozuk', kategori: 'gundem' },
        { ad: 'Kapalı Kaynak', url: 'https://a.example/kapali', kategori: 'gundem', aktif: false },
      ],
    }),
  );
  // Ajan için editör hesabı (yönetici rol verir)
  await request(app).post('/api/auth/kayit').send({ ad: 'haber10da ajanı', eposta: 'ajan@haber10da.net', parola: 'ajan-parolasi' });
  const yon = await request(app).post('/api/auth/giris').send({ eposta: 'admin@haber10da.net', parola: 'admin1234' });
  const liste = await request(app).get('/api/admin/kullanicilar').set('Authorization', `Bearer ${yon.body.erisim}`);
  const ajan = liste.body.find((k) => k.eposta === 'ajan@haber10da.net');
  await request(app).patch(`/api/admin/kullanicilar/${ajan.id}`).set('Authorization', `Bearer ${yon.body.erisim}`).send({ rol: 'editor' });
});

afterAll(async () => {
  config.llmAcik = false;
  llm?.close();
  sunucu.close();
  await kapat();
});

const ortak = () => ({
  taban,
  eposta: 'ajan@haber10da.net',
  parola: 'ajan-parolasi',
  kaynakDosyasi,
  gecmisDosyasi: path.join(klasor, 'gecmis.json'),
  getir,
});

describe('seçim', () => {
  it('kategoriler arasında sırayla seçer ve benzer başlıkları eler', () => {
    const a = [oge(1, 'gundem'), { ...oge(1, 'gundem'), baglanti: 'https://x/kopya' }, oge(2, 'gundem'), oge(4, 'spor')];
    const s = sec(a, 3);
    expect(s.map((x) => x.kategori)).toEqual(['gundem', 'spor', 'gundem']);
    expect(new Set(s.map((x) => x.baslik)).size).toBe(3);
  });
});

describe('ajan (dil modeli yokken)', () => {
  it('uygun haberleri API üzerinden ekler, yayımlar ve kaynağı gösterir', async () => {
    const rapor = await ajanCalistir({ ...ortak(), adet: 5, yayinla: true });
    expect(rapor.eklenen).toHaveLength(3); // eski ve kısa metinli olanlar alınmadı
    expect(rapor.hatalar.some((h) => h.startsWith('Bozuk Kaynak'))).toBe(true);
    expect(rapor.eklenen.every((h) => h.yazim === 'kaynak')).toBe(true);

    const r = await request(app).get(`/api/haberler/${rapor.eklenen[0].slug}`).expect(200);
    expect(r.body.kaynak.ad).toMatch(/^Örnek/);
    expect(r.body.kaynak.url).toMatch(/^https:\/\/kaynak\.example\//);
    expect(r.body.yazar.ad).toBe('haber10da ajanı');
  });

  it('ikinci çalıştırmada aynı haberleri tekrar eklemez', async () => {
    const rapor = await ajanCalistir({ ...ortak(), adet: 5, yayinla: true });
    expect(rapor.eklenen).toHaveLength(0);
  });

  it('geçmiş dosyası silinse bile sunucu aynı kaynağı ikinci kez kabul etmez (409)', async () => {
    const rapor = await ajanCalistir({ ...ortak(), gecmisDosyasi: path.join(klasor, 'yeni-gecmis.json'), adet: 5 });
    expect(rapor.eklenen).toHaveLength(0);
    expect(rapor.atlanan).toHaveLength(3);
  });

  it('deneme kipinde hiçbir şey yazmaz', async () => {
    AKISLAR['https://a.example/gundem'].push(oge(9, 'gundem'));
    const rapor = await ajanCalistir({ ...ortak(), dene: true });
    expect(rapor.eklenen).toHaveLength(0);
    const yok = await request(app).get('/api/arama').query({ q: 'otobüs hattı' });
    expect(yok.body.sonuclar.some((h) => h.baslik.includes('otobüs'))).toBe(false);
  });

  it('yanlış parolayla durur', async () => {
    await expect(ajanCalistir({ ...ortak(), parola: 'yanlis' })).rejects.toThrow();
  });
});

describe('ajan (dil modeliyle)', () => {
  it('haberi yapılandırılmış çıktıyla yeniden yazar, özet ve etiket ekler', async () => {
    llm = http.createServer((req, res) => {
      let g = '';
      req.on('data', (d) => (g += d));
      req.on('end', () => {
        const istek = JSON.parse(g);
        res.writeHead(200, { 'content-type': 'application/json' });
        if (req.url.endsWith('/embeddings')) {
          res.end(JSON.stringify({ data: istek.input.map((_, index) => ({ index, embedding: Array.from({ length: 768 }, (_, i) => Math.cos(i)) })) }));
          return;
        }
        const kaynak = istek.messages.at(-1).content;
        res.end(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    baslik: 'Yeniden yazılmış başlık: ' + kaynak.match(/haberi (\d+)/)[1],
                    spot: 'Kaynakta yer alan bilgiye göre yeni bir gelişme yaşandı.',
                    icerik: 'Birinci paragraf yalnızca kaynaktaki bilgiyi aktarıyor.\n\nİkinci paragraf kısa tutuldu.',
                    ozet: 'Kaynaktaki gelişme kısa özetle aktarıldı.',
                    etiketler: ['Örnek', 'deneme'],
                    kategori: 'kampus',
                  }),
                },
              },
            ],
          }),
        );
      });
    });
    await new Promise((r) => llm.listen(0, r));
    config.LLM_BASE_URL = `http://127.0.0.1:${llm.address().port}/v1`;
    config.llmAcik = true;
    llmDevresi.durum = 'KAPALI';

    AKISLAR['https://a.example/spor'].push(oge(7, 'spor'));
    const rapor = await ajanCalistir({ ...ortak(), adet: 5, yayinla: true });
    expect(rapor.eklenen.length).toBeGreaterThanOrEqual(1);
    const h = rapor.eklenen[0];
    expect(h.yazim).toBe('yz');
    expect(h.kategori).toBe('kampus');
    const r = await request(app).get(`/api/haberler/${h.slug}`).expect(200);
    expect(r.body.ozet).toBe('Kaynaktaki gelişme kısa özetle aktarıldı.');
    expect(r.body.ozetKaynak).toBe('yz');
    expect(r.body.etiketler).toEqual(['örnek', 'deneme']);
  });
});
