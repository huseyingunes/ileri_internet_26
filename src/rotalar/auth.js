// Kimlik doğrulama uç noktaları: kayıt, giriş, belirteç yenileme, çıkış, GitHub OAuth.
import { Router } from 'express';
import { z } from 'zod';
import { eq, or } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { kullanicilar } from '../db/schema.js';
import { dogrula } from '../ara-katmanlar/genel.js';
import { hizSinirla } from '../ara-katmanlar/hizSinirla.js';
import { onbellekYasak } from '../ara-katmanlar/httpOnbellek.js';
import { girisGerekli, kaynakDenetimi } from '../kimlik/ara-katmanlar.js';
import { parolaDogrula, parolaOzetle, sahteDogrulama } from '../kimlik/parola.js';
import {
  YENILEME_CEREZI, erisimBelirteci, oturumuKapat, yenile, yenilemeCereziAyarla, yenilemeCereziSil, yenilemeUret,
} from '../kimlik/belirtec.js';
import { DURUM_CEREZI, koduTakasEt, profilAl, yetkilendirmeAdresi } from '../kimlik/github.js';
import { ApiHatasi, bulunamadi, cakisma, yetkisiz } from '../lib/hatalar.js';
import { logger } from '../lib/logger.js';

export const authRotalari = Router();
authRotalari.use(onbellekYasak);

export const kullaniciDTO = (k) => ({ id: k.id, ad: k.ad, eposta: k.eposta, rol: k.rol, avatar: k.avatar });

async function oturumAc(res, kullanici) {
  yenilemeCereziAyarla(res, await yenilemeUret(kullanici.id));
  return { kullanici: kullaniciDTO(kullanici), erisim: erisimBelirteci(kullanici) };
}

const Eposta = z.email('Geçerli bir e-posta adresi girin.').transform((s) => s.toLowerCase());

authRotalari.post(
  '/kayit',
  hizSinirla({ ad: 'kayit', pencereMs: 15 * 60_000, azami: 5 }),
  dogrula({
    body: z.object({
      ad: z.string().trim().min(2, 'Ad en az 2 karakter olmalı.').max(60),
      eposta: Eposta,
      // bcrypt yalnızca ilk 72 baytı kullanır
      parola: z.string().min(8, 'Parola en az 8 karakter olmalı.').max(72),
    }),
  }),
  async (req, res) => {
    const { ad, eposta, parola } = req.gecerli.body;
    const [var_] = await db.select({ id: kullanicilar.id }).from(kullanicilar).where(eq(kullanicilar.eposta, eposta));
    if (var_) throw cakisma('Bu e-posta adresiyle kayıtlı bir hesap var.');
    const [k] = await db
      .insert(kullanicilar)
      .values({ ad, eposta, parolaOzeti: await parolaOzetle(parola) })
      .returning();
    res.status(201).json(await oturumAc(res, k));
  },
);

authRotalari.post(
  '/giris',
  hizSinirla({ ad: 'giris', pencereMs: 15 * 60_000, azami: 10, anahtar: (req) => `${req.ip}:${req.body?.eposta}` }),
  dogrula({ body: z.object({ eposta: Eposta, parola: z.string().min(1).max(72) }) }),
  async (req, res) => {
    const { eposta, parola } = req.gecerli.body;
    const [k] = await db.select().from(kullanicilar).where(eq(kullanicilar.eposta, eposta));
    const dogru = k ? await parolaDogrula(parola, k.parolaOzeti) : await sahteDogrulama();
    // Hangi alanın yanlış olduğunu söyleme: hesap varlığı sızmasın
    if (!k || !dogru) throw yetkisiz('E-posta veya parola hatalı.');
    res.json(await oturumAc(res, k));
  },
);

authRotalari.post('/yenile', kaynakDenetimi, async (req, res) => {
  // Çerez hiç yoksa hata değil: ziyaretçi giriş yapmamış (konsolu 401 ile kirletmeyelim)
  if (!req.cookies[YENILEME_CEREZI]) return res.status(204).end();
  try {
    const { kullanici, yenileme, erisim } = await yenile(req.cookies[YENILEME_CEREZI]);
    yenilemeCereziAyarla(res, yenileme);
    res.json({ kullanici: kullaniciDTO(kullanici), erisim });
  } catch (err) {
    yenilemeCereziSil(res);
    throw err;
  }
});

authRotalari.post('/cikis', kaynakDenetimi, async (req, res) => {
  await oturumuKapat(req.cookies[YENILEME_CEREZI]);
  yenilemeCereziSil(res);
  res.status(204).end();
});

authRotalari.get('/ben', girisGerekli, async (req, res) => {
  const [k] = await db.select().from(kullanicilar).where(eq(kullanicilar.id, req.kullanici.id));
  if (!k) throw bulunamadi('Kullanıcı');
  res.json(kullaniciDTO(k));
});

authRotalari.get('/saglayicilar', (_req, res) => res.json({ eposta: true, github: config.githubAcik }));

authRotalari.get('/github', (_req, res) => {
  if (!config.githubAcik) throw new ApiHatasi(404, 'GitHub girişi yapılandırılmamış');
  const { adres, state, verifier } = yetkilendirmeAdresi();
  res.cookie(DURUM_CEREZI, JSON.stringify({ state, verifier }), {
    httpOnly: true,
    secure: config.uretimde,
    sameSite: 'lax', // GitHub'dan dönüş üst düzey yönlendirme olduğu için lax gerekir
    signed: true, // değiştirilemez: sunucu imzası
    maxAge: 10 * 60_000,
    path: '/api/auth/github',
  });
  res.redirect(adres);
});

authRotalari.get('/github/geri-donus', async (req, res) => {
  const ham = req.signedCookies[DURUM_CEREZI];
  res.clearCookie(DURUM_CEREZI, { path: '/api/auth/github' });
  try {
    const { state, verifier } = JSON.parse(ham ?? '{}');
    if (!state || state !== req.query.state) throw new Error('state uyuşmuyor (olası CSRF)');
    const profil = await profilAl(await koduTakasEt(String(req.query.code), verifier));

    const [mevcut] = await db
      .select()
      .from(kullanicilar)
      .where(or(eq(kullanicilar.githubId, profil.githubId), eq(kullanicilar.eposta, profil.eposta)));
    let k;
    if (mevcut) {
      [k] = await db
        .update(kullanicilar)
        .set({ githubId: profil.githubId, avatar: profil.avatar })
        .where(eq(kullanicilar.id, mevcut.id))
        .returning();
    } else {
      [k] = await db.insert(kullanicilar).values(profil).returning();
    }
    yenilemeCereziAyarla(res, await yenilemeUret(k.id));
    res.redirect('/?giris=github');
  } catch (err) {
    logger.warn({ err: err.message }, 'GitHub girişi başarısız');
    res.redirect('/giris?hata=github');
  }
});
