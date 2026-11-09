// Devre kesici (circuit breaker) — dış servis (ör. LLM) art arda hata verirse
// bir süre hiç çağırma, doğrudan yedek davranışa geç. Sistemi çöken bağımlılıktan korur.
//
//   KAPALI ──(esik kadar hata)──▶ ACIK ──(bekleme süresi doldu)──▶ YARI_ACIK
//      ▲                                                            │
//      └──────────────(deneme başarılı)─────────────────────────────┘
//                      (deneme başarısız) → tekrar ACIK
export class DevreKesici {
  constructor(ad, { esik = 5, beklemeMs = 30_000, saat = () => Date.now() } = {}) {
    this.ad = ad;
    this.esik = esik;
    this.beklemeMs = beklemeMs;
    this.saat = saat;
    this.durum = 'KAPALI';
    this.hataSayisi = 0;
    this.acilmaZamani = 0;
    this.dinleyiciler = [];
  }

  durumDegisti(fn) {
    this.dinleyiciler.push(fn);
  }

  #gecis(yeni) {
    if (this.durum === yeni) return;
    this.durum = yeni;
    for (const fn of this.dinleyiciler) fn(yeni);
  }

  async calistir(islem, yedek) {
    if (this.durum === 'ACIK') {
      if (this.saat() - this.acilmaZamani >= this.beklemeMs) {
        this.#gecis('YARI_ACIK');
      } else {
        if (yedek) return yedek(new Error(`${this.ad} devresi açık`));
        throw new Error(`${this.ad} devresi açık`);
      }
    }
    try {
      const sonuc = await islem();
      this.hataSayisi = 0;
      this.#gecis('KAPALI');
      return sonuc;
    } catch (err) {
      this.hataSayisi += 1;
      if (this.durum === 'YARI_ACIK' || this.hataSayisi >= this.esik) {
        this.acilmaZamani = this.saat();
        this.#gecis('ACIK');
      }
      if (yedek) return yedek(err);
      throw err;
    }
  }
}
