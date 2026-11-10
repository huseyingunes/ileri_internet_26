import { describe, it, expect } from 'vitest';
import { yerelGomme } from '../../src/ai/gomme.js';
import { yerelEtiketler } from '../../src/ai/ozet.js';
import { rssCoz } from '../../src/lib/rss.js';
import { etagHesapla } from '../../src/ara-katmanlar/httpOnbellek.js';

const kosinus = (a, b) => a.reduce((t, x, i) => t + x * b[i], 0);

describe('yerel gömme', () => {
  it('birim uzunlukta 768 boyutlu vektör üretir', () => {
    const v = yerelGomme('Redis bellek içi veri deposu');
    expect(v).toHaveLength(768);
    expect(Math.hypot(...v)).toBeCloseTo(1, 5);
  });
  it('benzer metinler ilgisiz metinlerden daha yakındır', () => {
    const a = yerelGomme('Kütüphane final haftasında gece de açık kalacak');
    const b = yerelGomme('Final haftası boyunca kütüphaneler gece açık');
    const c = yerelGomme('E-spor takımı için seçmeler başladı');
    expect(kosinus(a, b)).toBeGreaterThan(kosinus(a, c));
  });
});

describe('yerel etiketler', () => {
  it('sık geçen uzun kelimeleri seçer', () => {
    const e = yerelEtiketler('Kütüphane açık. Kütüphane gece açık. Kütüphanede salonlar. Salonlar dolu.');
    expect(e[0]).toMatch(/^kütüphane/);
  });
});

describe('RSS çözümleyici', () => {
  it('RSS 2.0 öğelerini okur', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title>Başlık &amp; bir</title><link>https://a.org/1</link><description><![CDATA[<p>Açıklama metni</p>]]></description><pubDate>Mon, 09 Nov 2026 10:00:00 GMT</pubDate></item>
      <item><title>İkinci</title><link>https://a.org/2</link><description>İki</description></item>
    </channel></rss>`;
    const o = rssCoz(xml);
    expect(o).toHaveLength(2);
    expect(o[0]).toMatchObject({ baslik: 'Başlık & bir', baglanti: 'https://a.org/1', aciklama: 'Açıklama metni' });
    expect(o[0].tarih.toISOString()).toBe('2026-11-09T10:00:00.000Z');
  });
  it('Atom akışını okur', () => {
    const xml = `<feed><entry><title>Atom haberi</title><link href="https://b.org/x"/><summary>Özet</summary><updated>2026-11-01T00:00:00Z</updated></entry></feed>`;
    expect(rssCoz(xml)[0]).toMatchObject({ baslik: 'Atom haberi', baglanti: 'https://b.org/x' });
  });
});

describe('ETag', () => {
  it('aynı içerik aynı, farklı içerik farklı ETag üretir', () => {
    expect(etagHesapla('{"a":1}')).toBe(etagHesapla('{"a":1}'));
    expect(etagHesapla('{"a":1}')).not.toBe(etagHesapla('{"a":2}'));
    expect(etagHesapla('x')).toMatch(/^W\/".+"$/);
  });
});
