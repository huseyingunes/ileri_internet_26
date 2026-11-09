// Önbellek katmanı. REDIS_URL varsa Redis, yoksa aynı arayüzü sunan bellek içi yedek.
// Kullanılan Redis veri yapıları:
//   STRING + EX      → JSON önbelleği (cache-aside)
//   INCR + PEXPIRE   → hız sınırlama sayacı
//   ZSET (ZINCRBY)   → "en çok okunan" sıralaması
//   PUB/SUB          → sunucular arası canlı olay dağıtımı (SSE)
import { EventEmitter } from 'node:events';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { onbellekSayaci } from '../lib/metrikler.js';

class BellekOnbellek {
  tur = 'bellek';
  #veri = new Map();
  #zsetler = new Map();
  #olaylar = new EventEmitter().setMaxListeners(0);

  async get(k) {
    const kayit = this.#veri.get(k);
    if (!kayit) return null;
    if (kayit.bitis && kayit.bitis < Date.now()) {
      this.#veri.delete(k);
      return null;
    }
    return kayit.deger;
  }
  async set(k, deger, ttlSn) {
    this.#veri.set(k, { deger, bitis: ttlSn ? Date.now() + ttlSn * 1000 : 0 });
  }
  async del(...anahtarlar) {
    for (const k of anahtarlar) this.#veri.delete(k);
  }
  async incr(k, ttlMs) {
    const simdi = Date.now();
    let kayit = this.#veri.get(k);
    if (!kayit || kayit.bitis < simdi) kayit = { deger: 0, bitis: simdi + ttlMs };
    kayit.deger += 1;
    this.#veri.set(k, kayit);
    return { sayi: kayit.deger, kalanMs: kayit.bitis - simdi };
  }
  async zincr(set, uye, n = 1) {
    const z = this.#zsetler.get(set) ?? new Map();
    z.set(uye, (z.get(uye) ?? 0) + n);
    this.#zsetler.set(set, z);
  }
  async ztop(set, adet) {
    const z = this.#zsetler.get(set) ?? new Map();
    return [...z.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, adet)
      .map(([uye, skor]) => ({ uye, skor }));
  }
  async yayinla(kanal, veri) {
    this.#olaylar.emit(kanal, veri);
  }
  async abone(kanal, fn) {
    this.#olaylar.on(kanal, fn);
  }
  async saglik() {
    return true;
  }
  async kapat() {}
}

class RedisOnbellek {
  tur = 'redis';
  constructor(url, Redis) {
    const ayar = { maxRetriesPerRequest: 2, enableOfflineQueue: false, lazyConnect: true };
    this.r = new Redis(url, ayar);
    this.alt = new Redis(url, { ...ayar, enableOfflineQueue: true }); // abonelik ayrı bağlantı ister
    this.dinleyiciler = new Map();
    this.alt.on('message', (kanal, mesaj) => {
      for (const fn of this.dinleyiciler.get(kanal) ?? []) fn(JSON.parse(mesaj));
    });
    for (const b of [this.r, this.alt]) b.on('error', (err) => logger.warn({ err: err.message }, 'Redis hatası'));
  }
  async baglan() {
    await Promise.all([this.r.connect(), this.alt.connect()]);
  }
  async get(k) {
    const v = await this.r.get(k);
    return v ? JSON.parse(v) : null;
  }
  async set(k, deger, ttlSn) {
    const v = JSON.stringify(deger);
    if (ttlSn) await this.r.set(k, v, 'EX', ttlSn);
    else await this.r.set(k, v);
  }
  async del(...anahtarlar) {
    if (anahtarlar.length) await this.r.del(...anahtarlar);
  }
  async incr(k, ttlMs) {
    // MULTI: iki komut atomik çalışır; ilk istekte süre başlatılır (NX).
    const [[, sayi], , [, kalanMs]] = await this.r
      .multi()
      .incr(k)
      .pexpire(k, ttlMs, 'NX')
      .pttl(k)
      .exec();
    return { sayi, kalanMs };
  }
  async zincr(set, uye, n = 1) {
    await this.r.zincrby(set, n, uye);
  }
  async ztop(set, adet) {
    const ham = await this.r.zrevrange(set, 0, adet - 1, 'WITHSCORES');
    const sonuc = [];
    for (let i = 0; i < ham.length; i += 2) sonuc.push({ uye: ham[i], skor: Number(ham[i + 1]) });
    return sonuc;
  }
  async yayinla(kanal, veri) {
    await this.r.publish(kanal, JSON.stringify(veri));
  }
  async abone(kanal, fn) {
    if (!this.dinleyiciler.has(kanal)) {
      this.dinleyiciler.set(kanal, []);
      await this.alt.subscribe(kanal);
    }
    this.dinleyiciler.get(kanal).push(fn);
  }
  async saglik() {
    return (await this.r.ping()) === 'PONG';
  }
  async kapat() {
    this.r.disconnect();
    this.alt.disconnect();
  }
}

export let onbellek = new BellekOnbellek();

export async function onbellekBaglan() {
  if (!config.REDIS_URL) {
    logger.warn('REDIS_URL yok: bellek içi önbellek kullanılıyor (tek süreç için uygundur)');
    return onbellek;
  }
  const { default: Redis } = await import('ioredis');
  const r = new RedisOnbellek(config.REDIS_URL, Redis);
  try {
    await r.baglan();
    onbellek = r;
    logger.info('Redis bağlantısı kuruldu');
  } catch (err) {
    logger.error({ err: err.message }, 'Redis bağlanamadı: bellek içi yedeğe geçildi');
  }
  return onbellek;
}

// Sürümlü anahtar ile toplu geçersiz kılma: "haberler" sürümü artınca eski anahtarlar
// bir daha okunmaz, süreleri dolunca kendiliğinden silinir. SCAN/KEYS gerekmez.
export async function surum(ad) {
  return (await onbellek.get(`surum:${ad}`)) ?? 1;
}
export async function surumArtir(ad) {
  const s = (await surum(ad)) + 1;
  await onbellek.set(`surum:${ad}`, s);
  return s;
}

// Cache-aside + "thundering herd" koruması: aynı anahtarı aynı anda üreten istekler
// tek bir veritabanı sorgusunu paylaşır.
const ucustakiler = new Map();
export async function onbellekle(anahtar, ttlSn, uretici) {
  try {
    const var_ = await onbellek.get(anahtar);
    if (var_ !== null) {
      onbellekSayaci.inc({ sonuc: 'isabet' });
      return { veri: var_, isabet: true };
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Önbellek okunamadı; doğrudan kaynağa gidiliyor');
  }
  onbellekSayaci.inc({ sonuc: 'kacirma' });
  if (!ucustakiler.has(anahtar)) {
    ucustakiler.set(
      anahtar,
      (async () => {
        try {
          const veri = await uretici();
          await onbellek.set(anahtar, veri, ttlSn).catch(() => {});
          return veri;
        } finally {
          ucustakiler.delete(anahtar);
        }
      })(),
    );
  }
  return { veri: await ucustakiler.get(anahtar), isabet: false };
}
