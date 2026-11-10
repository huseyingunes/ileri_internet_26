// Ajan için editör hesabı açar (bir kez çalıştırılır):  npm run ajan:hesap
//   1. AJAN_PAROLA yoksa rastgele üretir ve .env dosyasına yazar.
//   2. API üzerinden hesabı kaydeder (okur rolüyle açılır).
//   3. Yönetici hesabıyla girip ajanın rolünü "editor" yapar.
// Her şey API üzerinden yapılır; sunucu çalışırken de güvenle çalıştırılabilir.
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { api, sunucuyuGarantile, yaz } from './gunluk.js';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ENV = path.join(KOK, '.env');

const taban = (config.AJAN_API || `http://localhost:${config.PORT}`).replace(/\/$/, '');
const eposta = config.AJAN_EPOSTA;
let parola = config.AJAN_PAROLA;

if (!parola) {
  parola = randomBytes(15).toString('base64url');
  const mevcut = existsSync(ENV) ? readFileSync(ENV, 'utf8') : '';
  appendFileSync(ENV, `${mevcut && !mevcut.endsWith('\n') ? '\n' : ''}\n# Günlük haber ajanı\nAJAN_EPOSTA=${eposta}\nAJAN_PAROLA=${parola}\n`);
  yaz(`Ajan parolası üretildi ve .env dosyasına yazıldı.`);
}

const adminParola = config.ADMIN_PAROLA ?? (config.uretimde ? null : 'admin1234');
if (!adminParola) {
  yaz('HATA: Yönetici parolası bilinmiyor. .env dosyasına ADMIN_PAROLA ekleyin.');
  process.exit(1);
}

const gecici = await sunucuyuGarantile(taban);
try {
  const ajanBelirtec = { deger: null };
  const ajan = api(taban, ajanBelirtec);
  try {
    await ajan('/api/auth/kayit', { yontem: 'POST', govde: { ad: 'haber10da ajanı', eposta, parola } });
    yaz(`Hesap açıldı: ${eposta}`);
  } catch (err) {
    if (err.durum !== 409) throw err;
    try {
      await ajan('/api/auth/giris', { yontem: 'POST', govde: { eposta, parola } });
      yaz(`Hesap zaten var: ${eposta}`);
    } catch {
      throw new Error(`${eposta} hesabı var ama .env'deki AJAN_PAROLA ile giriş yapılamıyor. Parolayı düzeltin ya da AJAN_EPOSTA'yı değiştirin.`);
    }
  }

  const yonBelirtec = { deger: null };
  const yonetici = api(taban, yonBelirtec);
  yonBelirtec.deger = (await yonetici('/api/auth/giris', { yontem: 'POST', govde: { eposta: config.ADMIN_EPOSTA, parola: adminParola } })).erisim;
  const k = (await yonetici('/api/admin/kullanicilar')).find((x) => x.eposta === eposta);
  if (k.rol === 'okur') {
    await yonetici(`/api/admin/kullanicilar/${k.id}`, { yontem: 'PATCH', govde: { rol: 'editor' } });
    yaz('Rol "editor" yapıldı.');
  } else {
    yaz(`Rol zaten "${k.rol}".`);
  }
  yaz('Hazır. Denemek için: npm run ajan:dene   Gerçek çalıştırma: npm run ajan');
} catch (err) {
  yaz(`HATA: ${err.message}`);
  process.exitCode = 1;
} finally {
  gecici?.kill();
}
