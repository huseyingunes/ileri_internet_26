// Kimlik doğrulama, yetkilendirme ve editör akışı.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { uygulamaHazirla, kapat, bekle } from '../yardimci/hazirla.js';

let app;
beforeAll(async () => {
  app = await uygulamaHazirla();
});
afterAll(kapat);

const cerezAl = (r) => r.headers['set-cookie']?.find((c) => c.startsWith('h10_yenile='))?.split(';')[0];

async function girisYap(eposta = 'editor@haber10da.net', parola = 'editor1234') {
  const r = await request(app).post('/api/auth/giris').send({ eposta, parola }).expect(200);
  return { erisim: r.body.erisim, cerez: cerezAl(r), kullanici: r.body.kullanici };
}

describe('kayıt ve giriş', () => {
  it('kayıt okur rolüyle hesap açar, parola özetlenir', async () => {
    const r = await request(app)
      .post('/api/auth/kayit')
      .send({ ad: 'Deneme Öğrenci', eposta: 'Ogrenci@Ornek.edu.tr', parola: 'gizli-parola' })
      .expect(201);
    expect(r.body.kullanici).toMatchObject({ rol: 'okur', eposta: 'ogrenci@ornek.edu.tr' });
    expect(r.body.erisim.split('.')).toHaveLength(3); // JWT
    const cerez = r.headers['set-cookie'].find((c) => c.startsWith('h10_yenile='));
    expect(cerez).toMatch(/HttpOnly/);
    expect(cerez).toMatch(/SameSite=Strict/);
    expect(cerez).toMatch(/Path=\/api\/auth/);
  });

  it('aynı e-postayla ikinci kayıt 409', async () => {
    await request(app).post('/api/auth/kayit').send({ ad: 'Biri', eposta: 'ogrenci@ornek.edu.tr', parola: '12345678' }).expect(409);
  });

  it('kısa parola reddedilir', async () => {
    const r = await request(app).post('/api/auth/kayit').send({ ad: 'Biri', eposta: 'b@c.de', parola: '123' }).expect(400);
    expect(r.body.alanlar[0].mesaj).toContain('8');
  });

  it('yanlış parola ve olmayan hesap aynı mesajı döner', async () => {
    const a = await request(app).post('/api/auth/giris').send({ eposta: 'editor@haber10da.net', parola: 'yanlis' }).expect(401);
    const b = await request(app).post('/api/auth/giris').send({ eposta: 'yok@haber10da.net', parola: 'yanlis' }).expect(401);
    expect(a.body.detail).toBe(b.body.detail);
  });

  it('erişim belirteciyle /ben', async () => {
    const { erisim } = await girisYap();
    const r = await request(app).get('/api/auth/ben').set('Authorization', `Bearer ${erisim}`).expect(200);
    expect(r.body.rol).toBe('editor');
  });

  it('bozuk belirteç 401', async () => {
    await request(app).get('/api/auth/ben').set('Authorization', 'Bearer abc.def.ghi').expect(401);
  });

  it('çerez yoksa yenileme 204 döner', async () => {
    await request(app).post('/api/auth/yenile').expect(204);
  });
});

describe('yenileme belirteci döndürme', () => {
  it('her yenilemede yeni çerez verilir; eskisi tekrar kullanılırsa tüm oturum iptal edilir', async () => {
    const { cerez } = await girisYap();
    const y1 = await request(app).post('/api/auth/yenile').set('Cookie', cerez).expect(200);
    const yeniCerez = cerezAl(y1);
    expect(yeniCerez).not.toBe(cerez);

    // Saldırgan çaldığı eski belirteci kullanıyor
    const saldiri = await request(app).post('/api/auth/yenile').set('Cookie', cerez).expect(401);
    expect(saldiri.body.detail).toContain('güvenlik');
    // Meşru kullanıcının yeni belirteci de artık geçersiz
    await request(app).post('/api/auth/yenile').set('Cookie', yeniCerez).expect(401);
  });

  it('başka siteden gelen yenileme isteği reddedilir (CSRF)', async () => {
    const { cerez } = await girisYap();
    await request(app).post('/api/auth/yenile').set('Cookie', cerez).set('Origin', 'https://kotu.example').expect(403);
  });

  it('çıkış oturumu kapatır', async () => {
    const { cerez } = await girisYap();
    await request(app).post('/api/auth/cikis').set('Cookie', cerez).expect(204);
    await request(app).post('/api/auth/yenile').set('Cookie', cerez).expect(401);
  });
});

describe('yetkilendirme (RBAC)', () => {
  it('giriş yapmadan editör uç noktası 401', async () => {
    await request(app).get('/api/editor/haberler').expect(401);
  });
  it('okur rolü 403 alır', async () => {
    const r = await request(app).post('/api/auth/giris').send({ eposta: 'ogrenci@ornek.edu.tr', parola: 'gizli-parola' });
    await request(app).get('/api/editor/haberler').set('Authorization', `Bearer ${r.body.erisim}`).expect(403);
  });
  it('editör yönetici uç noktasına erişemez', async () => {
    const { erisim } = await girisYap();
    await request(app).get('/api/admin/kullanicilar').set('Authorization', `Bearer ${erisim}`).expect(403);
  });
  it('yönetici kullanıcıları listeler', async () => {
    const { erisim } = await girisYap('admin@haber10da.net', 'admin1234');
    const r = await request(app).get('/api/admin/kullanicilar').set('Authorization', `Bearer ${erisim}`).expect(200);
    expect(r.body.some((k) => k.rol === 'admin')).toBe(true);
    expect(r.body[0]).not.toHaveProperty('parolaOzeti');
  });
});

describe('editör akışı', () => {
  const haber = {
    baslik: 'Test haberi: kampüste yeni bisiklet park alanları',
    spot: 'Fakülte girişlerine eklenen park alanlarıyla kapasite iki katına çıktı.',
    icerik:
      'Kampüste bisiklet kullanımının artmasıyla fakülte girişlerine yeni park alanları eklendi. Alanların üstü kapalı ve aydınlatmalı. Öğrenciler bisikletlerini sabit halkalara kilitleyebilecek.',
    kategoriId: 2,
  };

  it('taslak oluşturur, yayımlar; önbellek geçersiz olur ve özet arka planda üretilir', async () => {
    const { erisim } = await girisYap();
    const yetki = { Authorization: `Bearer ${erisim}` };

    const once = await request(app).get('/api/haberler?limit=50');
    expect(once.headers['x-onbellek']).toBeDefined();

    const taslak = await request(app).post('/api/editor/haberler').set(yetki).send(haber).expect(201);
    expect(taslak.body.durum).toBe('taslak');
    expect(taslak.headers.location).toBe(`/api/editor/haberler/${taslak.body.id}`);

    // Taslak herkese görünmez
    await request(app).get(`/api/haberler/${taslak.body.slug}`).expect(404);

    await request(app).post(`/api/editor/haberler/${taslak.body.id}/yayinla`).set(yetki).expect(200);

    const sonra = await request(app).get('/api/haberler?limit=50');
    expect(sonra.headers['x-onbellek']).toBe('KACIRMA'); // sürüm arttı → eski önbellek okunmadı
    expect(sonra.body.toplam).toBe(once.body.toplam + 1);

    await bekle(300); // süreç içi kuyruk özet + gömme üretsin
    const detay = await request(app).get(`/api/haberler/${taslak.body.slug}`).expect(200);
    expect(detay.body.ozet).toBeTruthy();
    expect(detay.body.ozetKaynak).toBe('cikarimsal');
  });

  it('başkasının haberini düzenleyemez', async () => {
    const yazar = await girisYap();
    const h = await request(app).post('/api/editor/haberler').set('Authorization', `Bearer ${yazar.erisim}`).send(haber);
    await request(app)
      .post('/api/auth/kayit')
      .send({ ad: 'İkinci Editör', eposta: 'ikinci@haber10da.net', parola: 'parola123' });
    const admin = await girisYap('admin@haber10da.net', 'admin1234');
    const liste = await request(app).get('/api/admin/kullanicilar').set('Authorization', `Bearer ${admin.erisim}`);
    const ikinci = liste.body.find((k) => k.eposta === 'ikinci@haber10da.net');
    await request(app).patch(`/api/admin/kullanicilar/${ikinci.id}`).set('Authorization', `Bearer ${admin.erisim}`).send({ rol: 'editor' }).expect(200);
    const diger = await girisYap('ikinci@haber10da.net', 'parola123');
    await request(app)
      .patch(`/api/editor/haberler/${h.body.id}`)
      .set('Authorization', `Bearer ${diger.erisim}`)
      .send({ baslik: 'Ele geçirilmiş başlık denemesi' })
      .expect(403);
  });

  it('eksik alanlarda ayrıntılı doğrulama hatası', async () => {
    const { erisim } = await girisYap();
    const r = await request(app).post('/api/editor/haberler').set('Authorization', `Bearer ${erisim}`).send({ baslik: 'kısa' }).expect(400);
    const alanlar = r.body.alanlar.map((a) => a.alan);
    expect(alanlar).toEqual(expect.arrayContaining(['baslik', 'spot', 'icerik', 'kategoriId']));
  });
});

describe('hız sınırı', () => {
  it('aynı hesaba 10 başarısız denemeden sonra 429 + Retry-After', async () => {
    let son;
    for (let i = 0; i < 11; i++) {
      son = await request(app).post('/api/auth/giris').send({ eposta: 'hedef@haber10da.net', parola: 'x' });
    }
    expect(son.status).toBe(429);
    expect(Number(son.headers['retry-after'])).toBeGreaterThan(0);
    expect(son.headers['ratelimit-remaining']).toBe('0');
  });
});
