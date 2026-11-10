// Ajanın uygulama içinde zamanlanması (sunucu kurulumu). AJAN_ZAMANLA=evet ise:
//   - Ajan hesabını veritabanında hazırlar. Parola .env'de yoksa her açılışta rastgele üretilir
//     ve yalnızca bellekte tutulur; bu hesapla başka kimse giriş yapamaz.
//   - Her gün AJAN_SAAT'te (Türkiye saati, UTC+3) ajanı çalıştırır.
//   - Sunucu o günün saatinden sonra açıldıysa ve bugün henüz çalışmadıysa 1 dakika içinde çalıştırır.
// Böylece sunucuda cron ya da ayrı bir hizmet kurmak gerekmez; dağıtımla birlikte gelir.
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { kullanicilar } from '../db/schema.js';
import { parolaOzetle } from '../kimlik/parola.js';
import { logger } from '../lib/logger.js';
import { ajanCalistir } from './gunluk.js';

const TR_FARK = 3 * 3600_000; // Türkiye 2016'dan beri sürekli UTC+3
const DURUM = path.resolve('.veri/ajan-son-calisma.txt');

const turkiyeTarihi = (ms = Date.now()) => new Date(ms + TR_FARK).toISOString().slice(0, 10);

// Verilen Türkiye tarihindeki AJAN_SAAT'in UTC zaman damgası
function hedefZaman(tarih) {
  const [s, d] = config.AJAN_SAAT.split(':').map(Number);
  return Date.parse(`${tarih}T00:00:00Z`) + (s * 60 + d) * 60_000 - TR_FARK;
}

export function sonrakiCalisma(simdi = Date.now()) {
  const bugun = hedefZaman(turkiyeTarihi(simdi));
  return bugun > simdi ? bugun : bugun + 24 * 3600_000;
}

function sonCalismaTarihi() {
  try {
    return readFileSync(DURUM, 'utf8').trim();
  } catch {
    return null;
  }
}

async function ajanHesabi() {
  const eposta = config.AJAN_EPOSTA;
  const parola = config.AJAN_PAROLA ?? randomBytes(24).toString('base64url');
  const parolaOzeti = await parolaOzetle(parola);
  const [var_] = await db.select().from(kullanicilar).where(eq(kullanicilar.eposta, eposta));
  if (var_) {
    await db
      .update(kullanicilar)
      .set({ parolaOzeti, rol: var_.rol === 'okur' ? 'editor' : var_.rol })
      .where(eq(kullanicilar.id, var_.id));
  } else {
    await db.insert(kullanicilar).values({ ad: 'haber10da ajanı', eposta, rol: 'editor', parolaOzeti });
  }
  return { eposta, parola };
}

export async function ajanZamanlayiciBaslat(port) {
  if (config.AJAN_ZAMANLA !== 'evet') return;
  const hesap = await ajanHesabi();
  let calisiyor = false;
  let zamanlayici;

  async function calistir() {
    if (calisiyor) return;
    calisiyor = true;
    try {
      const rapor = await ajanCalistir({ taban: `http://127.0.0.1:${port}`, ...hesap });
      mkdirSync(path.dirname(DURUM), { recursive: true });
      writeFileSync(DURUM, turkiyeTarihi());
      logger.info({ eklenen: rapor.eklenen.length, hata: rapor.hatalar.length }, 'Günlük haber ajanı çalıştı');
    } catch (err) {
      logger.error({ err: err.message }, 'Günlük haber ajanı çalışamadı');
    } finally {
      calisiyor = false;
      planla();
    }
  }

  function planla() {
    clearTimeout(zamanlayici);
    const ne = sonrakiCalisma();
    zamanlayici = setTimeout(calistir, ne - Date.now());
    zamanlayici.unref();
    logger.info({ sonraki: new Date(ne).toISOString() }, 'Günlük haber ajanı zamanlandı');
  }

  const bugun = turkiyeTarihi();
  if (sonCalismaTarihi() !== bugun && Date.now() >= hedefZaman(bugun)) {
    logger.info('Ajan bugün henüz çalışmamış; 1 dakika içinde çalıştırılacak');
    setTimeout(calistir, 60_000).unref();
  } else {
    planla();
  }
}
