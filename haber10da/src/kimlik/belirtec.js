// Belirteç (token) yönetimi.
//   Erişim belirteci: kısa ömürlü JWT (15 dk), Authorization: Bearer başlığında taşınır, bellekte tutulur.
//   Yenileme belirteci: uzun ömürlü rastgele dize, httpOnly çerezde taşınır (JS okuyamaz → XSS'e dayanıklı).
//     Veritabanında belirtecin kendisi değil SHA-256 özeti saklanır.
//     Her yenilemede yenisi verilir (rotation); eski belirteç tekrar gelirse çalınmıştır →
//     o oturum ailesindeki tüm belirteçler iptal edilir (reuse detection).
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { and, eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { kullanicilar, yenilemeBelirtecleri } from '../db/schema.js';
import { yetkisiz } from '../lib/hatalar.js';
import { logger } from '../lib/logger.js';

const YAYINCI = 'haber10da';
const HEDEF = 'haber10da-api';
export const YENILEME_CEREZI = 'h10_yenile';

export function erisimBelirteci(k) {
  return jwt.sign({ rol: k.rol, ad: k.ad }, config.JWT_SECRET, {
    subject: String(k.id),
    expiresIn: config.JWT_ERISIM_SURESI,
    issuer: YAYINCI,
    audience: HEDEF,
    algorithm: 'HS256',
  });
}

export function erisimDogrula(belirtec) {
  // algorithms açıkça verilir: "alg: none" saldırısına karşı
  const yuk = jwt.verify(belirtec, config.JWT_SECRET, { issuer: YAYINCI, audience: HEDEF, algorithms: ['HS256'] });
  return { id: Number(yuk.sub), rol: yuk.rol, ad: yuk.ad };
}

const ozet = (s) => createHash('sha256').update(s).digest('hex');

export async function yenilemeUret(kullaniciId, aile = randomUUID()) {
  const belirtec = randomBytes(32).toString('base64url');
  await db.insert(yenilemeBelirtecleri).values({
    id: ozet(belirtec),
    kullaniciId,
    aile,
    sonKullanma: new Date(Date.now() + config.YENILEME_GUN * 86_400_000),
  });
  return belirtec;
}

// İşlem (transaction) + FOR UPDATE: aynı belirteçle eşzamanlı iki istek gelirse ikisi birden geçemez.
export async function yenile(belirtec) {
  if (!belirtec) throw yetkisiz('Oturum bulunamadı.');
  const sonuc = await db.transaction(async (tx) => {
    const [kayit] = await tx
      .select()
      .from(yenilemeBelirtecleri)
      .where(eq(yenilemeBelirtecleri.id, ozet(belirtec)))
      .for('update');
    if (!kayit || kayit.sonKullanma < new Date()) return { hata: 'Oturumun süresi doldu.' };
    if (kayit.kullanildi || kayit.iptal) {
      await tx.update(yenilemeBelirtecleri).set({ iptal: true }).where(eq(yenilemeBelirtecleri.aile, kayit.aile));
      logger.warn({ kullanici: kayit.kullaniciId }, 'Yenileme belirteci yeniden kullanıldı: oturum ailesi iptal edildi');
      return { hata: 'Oturum güvenlik nedeniyle sonlandırıldı. Lütfen yeniden giriş yapın.' };
    }
    await tx.update(yenilemeBelirtecleri).set({ kullanildi: true }).where(eq(yenilemeBelirtecleri.id, kayit.id));
    const [kullanici] = await tx.select().from(kullanicilar).where(eq(kullanicilar.id, kayit.kullaniciId));
    return { kayit, kullanici };
  });
  if (sonuc.hata) throw yetkisiz(sonuc.hata);
  const yeni = await yenilemeUret(sonuc.kullanici.id, sonuc.kayit.aile);
  return { kullanici: sonuc.kullanici, yenileme: yeni, erisim: erisimBelirteci(sonuc.kullanici) };
}

export async function oturumuKapat(belirtec) {
  if (!belirtec) return;
  const [kayit] = await db
    .select({ aile: yenilemeBelirtecleri.aile })
    .from(yenilemeBelirtecleri)
    .where(eq(yenilemeBelirtecleri.id, ozet(belirtec)));
  if (kayit) {
    await db
      .update(yenilemeBelirtecleri)
      .set({ iptal: true })
      .where(and(eq(yenilemeBelirtecleri.aile, kayit.aile)));
  }
}

export function yenilemeCereziAyarla(res, belirtec) {
  res.cookie(YENILEME_CEREZI, belirtec, {
    httpOnly: true,
    secure: config.uretimde,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: config.YENILEME_GUN * 86_400_000,
  });
}

export function yenilemeCereziSil(res) {
  res.clearCookie(YENILEME_CEREZI, { httpOnly: true, secure: config.uretimde, sameSite: 'strict', path: '/api/auth' });
}
