import express from 'express';
import cookieParser from 'cookie-parser';
import { auth, ROLLER } from './firebase.js';

const app = express();
const PORT = process.env.PORT ?? 3000;
const URETIM = process.env.NODE_ENV === 'production';
const CEREZ = '__session';
const OTURUM_SURESI = 5 * 24 * 60 * 60 * 1000; // 5 gün (Firebase en fazla 14 gün izin verir)

app.set('trust proxy', 1); // Nginx arkasında
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// ---------- Ara katmanlar ----------

async function oturumGerekli(req, res, next) {
  const cerez = req.cookies[CEREZ];
  if (!cerez) return res.status(401).json({ hata: 'Giriş yapmanız gerekiyor.' });
  try {
    // true: iptal edilmiş oturumlar da reddedilir (rol değişince eski çerez geçersiz olur)
    const k = await auth.verifySessionCookie(cerez, true);
    req.kullanici = {
      uid: k.uid,
      eposta: k.email,
      ad: k.name ?? k.email,
      foto: k.picture ?? null,
      yontem: k.firebase.sign_in_provider,
      rol: k.rol ?? 'okuyucu',
    };
    next();
  } catch {
    res.clearCookie(CEREZ, { path: '/' });
    res.status(401).json({ hata: 'Oturum süresi doldu, yeniden giriş yapın.' });
  }
}

const rolGerekli = (...roller) => (req, res, next) =>
  roller.includes(req.kullanici.rol)
    ? next()
    : res.status(403).json({ hata: 'Bu işlem için yetkiniz yok.' });

// ---------- Oturum ----------

// İstemci, Firebase'den aldığı kimlik belirtecini gönderir; sunucu bunu çereze çevirir.
app.post('/api/oturum/ac', async (req, res) => {
  const { idToken, hatirla = true } = req.body ?? {};
  if (!idToken) return res.status(400).json({ hata: 'Kimlik belirteci eksik.' });
  try {
    const c = await auth.verifyIdToken(idToken);
    if (Date.now() / 1000 - c.auth_time > 5 * 60)
      return res.status(401).json({ hata: 'Lütfen yeniden giriş yapın.' });
    if (c.firebase.sign_in_provider === 'password' && !c.email_verified)
      return res.status(403).json({ hata: 'E-posta adresiniz henüz doğrulanmadı.' });

    // "Oturumum açık kalsın" seçilmezse çerez tarayıcı kapanınca silinir (en fazla 1 gün)
    const sure = hatirla ? OTURUM_SURESI : 24 * 60 * 60 * 1000;
    const cerez = await auth.createSessionCookie(idToken, { expiresIn: sure });
    res.cookie(CEREZ, cerez, {
      ...(hatirla ? { maxAge: sure } : {}),
      httpOnly: true,
      secure: URETIM,
      sameSite: 'lax',
      path: '/',
    });
    res.json({ tamam: true });
  } catch {
    res.status(401).json({ hata: 'Geçersiz kimlik belirteci.' });
  }
});

app.post('/api/oturum/kapat', async (req, res) => {
  const cerez = req.cookies[CEREZ];
  res.clearCookie(CEREZ, { path: '/' });
  if (cerez) {
    try {
      const k = await auth.verifySessionCookie(cerez);
      await auth.revokeRefreshTokens(k.sub);
    } catch { /* zaten geçersiz */ }
  }
  res.json({ tamam: true });
});

app.get('/api/ben', oturumGerekli, (req, res) => res.json(req.kullanici));

// ---------- Haberler (örnek; veritabanı yerine bellek) ----------

const haberler = [];

app.get('/api/haberler', (req, res) => res.json(haberler));

app.post('/api/haberler', oturumGerekli, rolGerekli('editor', 'yonetici'), (req, res) => {
  const { baslik, icerik } = req.body ?? {};
  if (!baslik || !icerik) return res.status(400).json({ hata: 'Başlık ve içerik zorunlu.' });
  const haber = {
    id: haberler.length + 1,
    baslik,
    icerik,
    yazar: req.kullanici.ad,
    tarih: new Date().toISOString(),
  };
  haberler.unshift(haber);
  res.status(201).json(haber);
});

// ---------- Yönetim ----------

app.get('/api/yonetim/kullanicilar', oturumGerekli, rolGerekli('yonetici'), async (req, res) => {
  const { users } = await auth.listUsers(1000);
  res.json(users.map(u => ({
    uid: u.uid,
    eposta: u.email,
    ad: u.displayName,
    rol: u.customClaims?.rol ?? 'okuyucu',
    yontemler: u.providerData.map(p => p.providerId),
  })));
});

app.post('/api/yonetim/rol', oturumGerekli, rolGerekli('yonetici'), async (req, res) => {
  const { uid, rol } = req.body ?? {};
  if (!uid || !ROLLER.includes(rol)) return res.status(400).json({ hata: 'Geçersiz istek.' });
  await auth.setCustomUserClaims(uid, { rol });
  await auth.revokeRefreshTokens(uid); // yeni rol, bir sonraki girişte geçerli olur
  res.json({ tamam: true });
});

app.listen(PORT, () => console.log(`haber10da http://localhost:${PORT} adresinde çalışıyor`));
