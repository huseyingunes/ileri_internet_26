// Kimlik ara katmanları (middleware).
import { timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { erisimDogrula } from './belirtec.js';
import { ApiHatasi, yasak, yetkisiz } from '../lib/hatalar.js';

// Bearer belirteci varsa çöz ve req.kullanici'ya yaz; yoksa isteğe dokunma.
export function kimlikCoz(req, _res, next) {
  const baslik = req.get('authorization');
  if (baslik?.startsWith('Bearer ')) {
    try {
      req.kullanici = erisimDogrula(baslik.slice(7));
    } catch (err) {
      req.belirtecHatasi = err.name === 'TokenExpiredError' ? 'Erişim belirtecinin süresi doldu.' : 'Geçersiz belirteç.';
    }
  }
  next();
}

export function girisGerekli(req, _res, next) {
  if (!req.kullanici) return next(yetkisiz(req.belirtecHatasi));
  next();
}

// Rol tabanlı yetkilendirme (RBAC). Kimlik doğrulama "kimsin?", yetkilendirme "ne yapabilirsin?"
export const rolGerekli =
  (...roller) =>
  (req, _res, next) => {
    if (!req.kullanici) return next(yetkisiz(req.belirtecHatasi));
    if (!roller.includes(req.kullanici.rol)) return next(yasak(`Bu işlem için gereken rol: ${roller.join(' veya ')}`));
    next();
  };

// Temel kimlik doğrulama (HTTP Basic): "kullanici:parola" base64 ile Authorization başlığında.
// Yalnızca HTTPS üzerinde güvenlidir; burada Prometheus'un /metrics okuması için kullanılıyor.
export function temelKimlik(req, res, next) {
  if (!config.METRIK_PAROLA) return next(); // parola tanımlı değilse açık (geliştirme)
  const [tur, deger] = (req.get('authorization') ?? '').split(' ');
  const beklenen = Buffer.from(`${config.METRIK_KULLANICI}:${config.METRIK_PAROLA}`);
  const gelen = tur === 'Basic' ? Buffer.from(deger ?? '', 'base64') : Buffer.alloc(0);
  // Sabit zamanlı karşılaştırma: zamanlama saldırısını önler
  if (gelen.length === beklenen.length && timingSafeEqual(gelen, beklenen)) return next();
  res.set('WWW-Authenticate', 'Basic realm="haber10da metrikleri"');
  next(new ApiHatasi(401, 'Kimlik doğrulanamadı', 'Metrikler için kullanıcı adı ve parola gerekir.'));
}

// Çerezle çalışan durum değiştiren uç noktalarda CSRF koruması: Origin başlığı bizim sitemiz olmalı.
export function kaynakDenetimi(req, _res, next) {
  const kaynak = req.get('origin');
  if (!kaynak) return next(); // aynı kaynaklı bazı istekler Origin göndermez; SameSite=Strict çerez ayrıca korur
  const izinli = [config.SITE_URL, ...config.corsKaynaklari];
  if (izinli.includes(kaynak)) return next();
  next(yasak('İstek başka bir siteden geldiği için reddedildi.'));
}
