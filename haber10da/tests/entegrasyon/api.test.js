// Herkese açık API: listeleme, önbellek, doğrulama, arama, N+1, GraphQL.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { uygulamaHazirla, kapat } from '../yardimci/hazirla.js';
import { HABERLER } from '../../src/db/ornek-icerik.js';

let app;
beforeAll(async () => {
  app = await uygulamaHazirla();
});
afterAll(kapat);

describe('GET /api/haberler', () => {
  it('sayfalı liste döner, yazar ve kategori gömülü gelir', async () => {
    const r = await request(app).get('/api/haberler?limit=5').expect(200);
    expect(r.body.haberler).toHaveLength(5);
    expect(r.body.toplam).toBe(HABERLER.length);
    expect(r.body.haberler[0]).toHaveProperty('kategori.slug');
    expect(r.body.haberler[0]).toHaveProperty('yazar.ad');
    expect(r.body.haberler[0]).not.toHaveProperty('icerik'); // listede tam metin yok
    expect(r.body.haberler[0]).not.toHaveProperty('gomme'); // iç alan sızmıyor
  });

  it('en yeni haber önce gelir', async () => {
    const r = await request(app).get('/api/haberler?limit=3');
    const tarihler = r.body.haberler.map((h) => new Date(h.yayinTarihi).getTime());
    expect([...tarihler].sort((a, b) => b - a)).toEqual(tarihler);
  });

  it('ikinci istek sunucu önbelleğinden gelir', async () => {
    await request(app).get('/api/haberler?limit=4');
    const r = await request(app).get('/api/haberler?limit=4');
    expect(r.headers['x-onbellek']).toBe('ISABET');
    expect(r.headers['cache-control']).toMatch(/public, max-age=30/);
  });

  it('If-None-Match eşleşirse 304 döner', async () => {
    const ilk = await request(app).get('/api/haberler?limit=2');
    const r = await request(app).get('/api/haberler?limit=2').set('If-None-Match', ilk.headers.etag);
    expect(r.status).toBe(304);
    expect(r.text).toBeFalsy();
  });

  it('kategoriye göre süzer', async () => {
    const r = await request(app).get('/api/haberler?kategori=kampus').expect(200);
    expect(r.body.haberler.every((h) => h.kategori.slug === 'kampus')).toBe(true);
  });

  it('geçersiz sorguda Türkçe problem+json döner', async () => {
    const r = await request(app).get('/api/haberler?limit=999').expect(400);
    expect(r.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(r.body.title).toBe('Doğrulama hatası');
    expect(r.body.alanlar[0].alan).toBe('limit');
    expect(r.body.istekKimligi).toBeTruthy();
  });

  it('olmayan kategori 404', async () => {
    await request(app).get('/api/haberler?kategori=yok').expect(404);
  });
});

describe('tek haber', () => {
  it('slug ile tam metni ve özeti döner', async () => {
    const liste = await request(app).get('/api/haberler?limit=1');
    const r = await request(app).get(`/api/haberler/${liste.body.haberler[0].slug}`).expect(200);
    expect(r.body.icerik.length).toBeGreaterThan(100);
    expect(r.body.ozet).toBeTruthy();
  });

  it('benzer haberler vektör benzerliğiyle gelir', async () => {
    const liste = await request(app).get('/api/haberler?limit=1');
    const r = await request(app).get(`/api/haberler/${liste.body.haberler[0].slug}/benzer`).expect(200);
    expect(r.body.length).toBeGreaterThan(0);
    expect(r.body[0].benzerlik).toBeGreaterThan(0);
    expect(r.body.map((h) => h.slug)).not.toContain(liste.body.haberler[0].slug);
  });

  it('olmayan haber 404', async () => {
    const r = await request(app).get('/api/haberler/boyle-bir-haber-yok').expect(404);
    expect(r.body.title).toBe('Haber bulunamadı');
  });
});

describe('arama', () => {
  it('Türkçe kök bulma ile bulur ve vurgular', async () => {
    const r = await request(app).get('/api/arama').query({ q: 'kütüphaneler' }).expect(200);
    expect(r.body.motor).toBe('postgresql');
    expect(r.body.toplam).toBeGreaterThan(0);
    expect(r.body.sonuclar[0].vurgu).toContain('⟦');
  });
  it('kısa sorgu reddedilir', async () => {
    await request(app).get('/api/arama?q=a').expect(400);
  });
});

describe('N+1 gösterimi', () => {
  it('döngüde sorgu 1+2N, ilişkisel sorgu 1 sorgu atar', async () => {
    const kotu = await request(app).get('/api/ders/n-arti-bir?mod=kotu').expect(200);
    const iyi = await request(app).get('/api/ders/n-arti-bir?mod=iyi').expect(200);
    expect(kotu.body.sorguSayisi).toBe(1 + 2 * kotu.body.kayitSayisi);
    expect(iyi.body.sorguSayisi).toBe(1);
  });
});

describe('GraphQL', () => {
  it('iç içe alanları tek istekte döner', async () => {
    const r = await request(app)
      .post('/graphql')
      .send({ query: '{ haberler(ilk: 3) { toplam haberler { baslik yazar { ad } kategori { slug } } } }' })
      .expect(200);
    expect(r.body.data.haberler.haberler).toHaveLength(3);
    expect(r.body.data.haberler.haberler[0].yazar.ad).toBeTruthy();
  });
});

describe('sistem', () => {
  it('sağlık ve hazır olma denetimi', async () => {
    await request(app).get('/api/saglik').expect(200);
    const r = await request(app).get('/api/hazir').expect(200);
    expect(r.body.veritabani.durum).toBe('calisiyor');
  });
  it('güvenlik başlıkları var', async () => {
    const r = await request(app).get('/');
    expect(r.headers['content-security-policy']).toContain("script-src 'self'");
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-powered-by']).toBeUndefined();
  });
  it('Prometheus metrikleri', async () => {
    const r = await request(app).get('/api/metrics').expect(200);
    expect(r.text).toContain('haber10da_http_istek_suresi_saniye');
  });
  it('SPA geri dönüşü: bilinmeyen sayfa yolu index.html döner', async () => {
    const r = await request(app).get('/haber/bir-haber').expect(200);
    expect(r.text).toContain('<main id="icerik"');
  });
});
