// Mesaj kuyruğu. AMQP_URL varsa RabbitMQ, yoksa süreç içi kuyruk.
//
//   API ──yayinla('haber.yayinlandi')──▶ [exchange: haber10da (topic)]
//                                              │ yönlendirme anahtarı
//                                              ▼
//                                   [kuyruk: haber10da.haber-isleme] ──▶ worker
//                                              │ 3 kez başarısız
//                                              ▼
//                                   [haber10da.olu-mektup]  (dead letter)
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { kuyrukSayaci } from '../lib/metrikler.js';

const EXCHANGE = 'haber10da';
const DLX = 'haber10da.dlx';
const AZAMI_DENEME = 3;

class SurecIciKuyruk {
  tur = 'surec-ici';
  isleyiciler = new Map();
  bekleyen = 0; // henüz bitmemiş iş sayısı (sistem durumunda gösterilir)

  async yayinla(konu, veri) {
    kuyrukSayaci.inc({ konu, sonuc: 'yayinlandi' });
    const liste = this.isleyiciler.get(konu) ?? [];
    for (const fn of liste) {
      this.bekleyen += 1;
      // setImmediate: HTTP yanıtı beklemeden arka planda çalışsın
      setImmediate(async () => {
        try {
          for (let deneme = 1; deneme <= AZAMI_DENEME; deneme++) {
            try {
              await fn(veri);
              kuyrukSayaci.inc({ konu, sonuc: 'islendi' });
              return;
            } catch (err) {
              logger.warn({ konu, deneme, err: err.message }, 'Kuyruk işi başarısız');
              await new Promise((r) => setTimeout(r, 200 * 2 ** deneme));
            }
          }
          kuyrukSayaci.inc({ konu, sonuc: 'olu-mektup' });
        } finally {
          this.bekleyen -= 1;
        }
      });
    }
  }

  async tuket(kuyrukAdi, konular, fn) {
    for (const k of konular) {
      if (!this.isleyiciler.has(k)) this.isleyiciler.set(k, []);
      this.isleyiciler.get(k).push(fn);
    }
  }

  async saglik() {
    return true;
  }
  async kapat() {}
}

class RabbitKuyruk {
  tur = 'rabbitmq';

  async baglan(url) {
    const amqp = await import('amqplib');
    this.baglanti = await amqp.connect(url);
    this.kanal = await this.baglanti.createConfirmChannel();
    await this.kanal.assertExchange(EXCHANGE, 'topic', { durable: true });
    await this.kanal.assertExchange(DLX, 'fanout', { durable: true });
    await this.kanal.assertQueue('haber10da.olu-mektup', { durable: true });
    await this.kanal.bindQueue('haber10da.olu-mektup', DLX, '');
    this.baglanti.on('error', (err) => logger.error({ err: err.message }, 'RabbitMQ hatası'));
  }

  async yayinla(konu, veri) {
    const icerik = Buffer.from(JSON.stringify(veri));
    await new Promise((coz, red) =>
      this.kanal.publish(EXCHANGE, konu, icerik, { persistent: true, contentType: 'application/json' }, (err) =>
        err ? red(err) : coz(),
      ),
    );
    kuyrukSayaci.inc({ konu, sonuc: 'yayinlandi' });
  }

  async tuket(kuyrukAdi, konular, fn) {
    const ad = `haber10da.${kuyrukAdi}`;
    await this.kanal.assertQueue(ad, { durable: true, arguments: { 'x-dead-letter-exchange': DLX } });
    for (const k of konular) await this.kanal.bindQueue(ad, EXCHANGE, k);
    await this.kanal.prefetch(5); // aynı anda en fazla 5 işlenmemiş mesaj: geri basınç
    await this.kanal.consume(ad, async (mesaj) => {
      if (!mesaj) return;
      const konu = mesaj.fields.routingKey;
      const deneme = Number(mesaj.properties.headers?.['x-deneme'] ?? 1);
      try {
        await fn(JSON.parse(mesaj.content.toString()));
        this.kanal.ack(mesaj);
        kuyrukSayaci.inc({ konu, sonuc: 'islendi' });
      } catch (err) {
        logger.warn({ konu, deneme, err: err.message }, 'Mesaj işlenemedi');
        this.kanal.ack(mesaj);
        if (deneme < AZAMI_DENEME) {
          setTimeout(() => {
            this.kanal.publish(EXCHANGE, konu, mesaj.content, {
              ...mesaj.properties,
              headers: { ...mesaj.properties.headers, 'x-deneme': deneme + 1 },
            });
          }, 500 * 2 ** deneme);
        } else {
          this.kanal.publish(DLX, '', mesaj.content, mesaj.properties);
          kuyrukSayaci.inc({ konu, sonuc: 'olu-mektup' });
        }
      }
    });
    logger.info({ kuyruk: ad, konular }, 'Kuyruk dinleniyor');
  }

  async saglik() {
    return Boolean(this.kanal);
  }
  async kapat() {
    await this.kanal?.close().catch(() => {});
    await this.baglanti?.close().catch(() => {});
  }
}

export let kuyruk = new SurecIciKuyruk();

export async function kuyrukBaglan() {
  if (!config.AMQP_URL) {
    logger.warn('AMQP_URL yok: işler aynı süreç içinde çalıştırılacak');
    return kuyruk;
  }
  const r = new RabbitKuyruk();
  try {
    await r.baglan(config.AMQP_URL);
    kuyruk = r;
    logger.info('RabbitMQ bağlantısı kuruldu');
  } catch (err) {
    logger.error({ err: err.message }, 'RabbitMQ bağlanamadı: süreç içi kuyruğa geçildi');
  }
  return kuyruk;
}
