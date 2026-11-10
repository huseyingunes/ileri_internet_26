import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { uygulamaHazirla, kapat } from '../yardimci/hazirla.js';
import { sonrakiCalisma } from '../../src/ajan/zamanlayici.js';

describe('ajan zamanlayıcısı (AJAN_SAAT=08:00, Türkiye saati)', () => {
  it('saat 08.00 geçmediyse bugün 05:00 UTC, geçtiyse yarın 05:00 UTC', () => {
    expect(new Date(sonrakiCalisma(Date.parse('2026-11-10T04:00:00Z'))).toISOString()).toBe('2026-11-10T05:00:00.000Z');
    expect(new Date(sonrakiCalisma(Date.parse('2026-11-10T09:00:00Z'))).toISOString()).toBe('2026-11-11T05:00:00.000Z');
  });
  it('Türkiye gece yarısını UTC gününden ayırır (UTC 22:30 = TR ertesi gün 01:30)', () => {
    expect(new Date(sonrakiCalisma(Date.parse('2026-11-10T22:30:00Z'))).toISOString()).toBe('2026-11-11T05:00:00.000Z');
  });
});

describe('ders klasörleri', () => {
  let app;
  beforeAll(async () => {
    app = await uygulamaHazirla();
  });
  afterAll(kapat);

  it('ders sayfaları eski adreslerinden açılır, CSP uygulanmaz', async () => {
    const r = await request(app).get('/2_sinav/index.html').expect(200);
    expect(r.headers['content-type']).toMatch(/text\/html/);
    expect(r.headers['content-security-policy']).toBeUndefined();
    await request(app).get('/2_sinav/').expect(200);
  });
  it('öğrenci listesi, veritabanı ve Word dosyaları açılmaz', async () => {
    await request(app).get('/2_sinav/ogrenciler.csv').expect(404);
    await request(app).get('/3_sinav/sinav.db').expect(404);
    await request(app).get('/2_sinav/Cevap_Anahtari.docx').expect(404);
  });
  it('klasör dışına çıkılamaz', async () => {
    const r = await request(app).get('/2_sinav/..%2f.env');
    expect([403, 404]).toContain(r.status);
  });
});
