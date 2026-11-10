// Yapay zekâ katmanı — gerçek bir model yerine OpenAI uyumlu SAHTE sunucu kullanılır.
// Böylece testler ücretsiz, hızlı ve deterministik olur; ağ gerekmez.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import request from 'supertest';
import { uygulamaHazirla, kapat } from '../yardimci/hazirla.js';
import { config } from '../../src/config.js';
import { llmDevresi } from '../../src/ai/llm.js';
import { ozetUret } from '../../src/ai/ozet.js';

let app;
let sahte;
const gelenler = [];
let mod = 'normal'; // 'normal' | 'hata'

function sse(res, parcalar) {
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  for (const p of parcalar) res.write(`data: ${JSON.stringify({ choices: [{ delta: p }] })}\n\n`);
  res.end('data: [DONE]\n\n');
}

beforeAll(async () => {
  app = await uygulamaHazirla();
  sahte = http.createServer((req, res) => {
    let govde = '';
    req.on('data', (d) => (govde += d));
    req.on('end', () => {
      const istek = JSON.parse(govde || '{}');
      gelenler.push({ yol: req.url, istek });
      if (mod === 'hata') {
        res.writeHead(500).end('model çöktü');
        return;
      }
      if (req.url.endsWith('/embeddings')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: istek.input.map((_, index) => ({ index, embedding: Array.from({ length: 768 }, (_, i) => Math.sin(i + index)) })) }));
        return;
      }
      if (istek.response_format?.type === 'json_schema') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            choices: [{ message: { role: 'assistant', content: JSON.stringify({ ozet: 'Kütüphane final haftasında 24 saat açık kalacak.', etiketler: ['Kütüphane', 'final'] }) } }],
          }),
        );
        return;
      }
      if (istek.stream) {
        const aracSonucuVar = istek.messages.some((m) => m.role === 'tool');
        if (!aracSonucuVar) {
          // Önce araç çağrısı — argümanlar parça parça gelir
          return sse(res, [
            { tool_calls: [{ index: 0, id: 'cagri_1', type: 'function', function: { name: 'haber_ara', arguments: '' } }] },
            { tool_calls: [{ index: 0, function: { arguments: '{"sorgu":"kütüp' } }] },
            { tool_calls: [{ index: 0, function: { arguments: 'hane"}' } }] },
          ]);
        }
        return sse(res, [{ content: 'Kütüphane final haftasında ' }, { content: '24 saat açık [1].' }]);
      }
      res.writeHead(400).end();
    });
  });
  await new Promise((r) => sahte.listen(0, r));
  config.LLM_BASE_URL = `http://127.0.0.1:${sahte.address().port}/v1`;
  config.llmAcik = true;
});

afterAll(async () => {
  config.llmAcik = false;
  sahte.close();
  await kapat();
});

beforeEach(() => {
  mod = 'normal';
  gelenler.length = 0;
  llmDevresi.durum = 'KAPALI';
  llmDevresi.hataSayisi = 0;
});

describe('yapılandırılmış çıktı ile özet', () => {
  it('JSON Şeması gönderir, yanıtı doğrular, etiketleri küçük harfe çevirir', async () => {
    const o = await ozetUret({ baslik: 'Kütüphane', spot: 'Spot metni burada.', icerik: 'İçerik metni.' });
    expect(o).toEqual({ ozet: 'Kütüphane final haftasında 24 saat açık kalacak.', etiketler: ['kütüphane', 'final'], kaynak: 'yz' });
    const g = gelenler.find((x) => x.yol.endsWith('/chat/completions'));
    expect(g.istek.response_format.json_schema.schema.required).toEqual(['ozet', 'etiketler']);
  });

  it('model çökerse çıkarımsal özete düşer; 3 hatadan sonra devre açılır ve model hiç çağrılmaz', async () => {
    mod = 'hata';
    const girdi = { baslik: 'B', spot: 'Spot cümlesi burada yer alıyor.', icerik: 'İkinci cümle burada. Üçüncü cümle.' };
    for (let i = 0; i < 3; i++) expect((await ozetUret(girdi)).kaynak).toBe('cikarimsal');
    expect(llmDevresi.durum).toBe('ACIK');
    const once = gelenler.length;
    await ozetUret(girdi);
    expect(gelenler.length).toBe(once); // devre açık: istek gitmedi
  });
});

describe('asistan: araç çağırma + akış', () => {
  it('modelin araç çağrısını çalıştırır, kaynakları ve akan metni gönderir', async () => {
    const r = await request(app).post('/api/asistan/sor').send({ soru: 'Kütüphane açık mı?' }).expect(200);
    expect(r.headers['content-type']).toMatch(/text\/event-stream/);
    const olaylar = r.text
      .trim()
      .split('\n\n')
      .map((b) => ({ olay: b.match(/^event: (.+)$/m)[1], veri: JSON.parse(b.match(/^data: (.+)$/m)[1]) }));
    const adlar = olaylar.map((o) => o.olay);
    expect(adlar[0]).toBe('arac');
    expect(olaylar[0].veri).toMatchObject({ ad: 'haber_ara', arg: { sorgu: 'kütüphane' } });
    expect(adlar).toContain('kaynak');
    expect(adlar.at(-1)).toBe('bitti');
    const metin = olaylar.filter((o) => o.olay === 'parca').map((o) => o.veri.metin).join('');
    expect(metin).toBe('Kütüphane final haftasında 24 saat açık [1].');
    const kaynaklar = olaylar.find((o) => o.olay === 'kaynak').veri;
    expect(kaynaklar[0].slug).toContain('kutuphane');

    // İkinci model çağrısı araç sonucunu içermeli
    const ikinci = gelenler.filter((g) => g.istek.stream)[1].istek.messages;
    expect(ikinci.find((m) => m.role === 'tool').content).toContain('[1]');
  });

  it('kısa soru reddedilir', async () => {
    await request(app).post('/api/asistan/sor').send({ soru: 'a' }).expect(400);
  });
});
