// Ders klasörleri (1_api_rest, 2_sinav …) eski giriş sunucusunda olduğu gibi kendi adreslerinden yayınlanır:
//   haber10da.net/2_sinav/index.html
// Eski sunucuyla aynı kurallar: yalnızca belirli dosya türleri, nokta ile başlayan dosyalar ve server.js kapalı.
// Böylece öğrenci listesi (.csv), veritabanı (.db) ve Word dosyaları dışarı açılmaz.
// Bu sayfalar kendi satır içi betiklerini kullanabildiği için sitenin sıkı CSP'si burada uygulanmaz.
import path from 'node:path';

const KLASORLER = new Set(['1_api_rest', '2_authentication', '2_sinav', '3_sinav']);
const TURLER = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const bulunamadi = (res) => res.status(404).type('text/plain; charset=utf-8').send('Sayfa bulunamadı');

export function dersKlasorleri(kok) {
  return (req, res, next) => {
    const klasor = req.path.split('/')[1];
    if (!KLASORLER.has(klasor) || !['GET', 'HEAD'].includes(req.method)) return next();

    let yol;
    try {
      yol = decodeURIComponent(req.path);
    } catch {
      return res.status(400).type('text/plain; charset=utf-8').send('Adres okunamadı');
    }
    if (yol.endsWith('/')) yol += 'index.html';

    const dosya = path.resolve(kok, `.${yol}`);
    if (!dosya.startsWith(path.join(kok, klasor) + path.sep)) {
      return res.status(403).type('text/plain; charset=utf-8').send('Bu dosyaya erişilemez');
    }
    const ad = path.basename(dosya).toLowerCase();
    const tur = TURLER[path.extname(dosya).toLowerCase()];
    if (ad === 'server.js' || ad.startsWith('.') || !tur) return bulunamadi(res);

    res.sendFile(dosya, { headers: { 'Content-Type': tur }, dotfiles: 'deny' }, (err) => {
      if (err && !res.headersSent) bulunamadi(res);
    });
  };
}
