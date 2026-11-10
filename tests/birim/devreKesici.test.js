import { describe, it, expect } from 'vitest';
import { DevreKesici } from '../../src/lib/devreKesici.js';

const hata = () => Promise.reject(new Error('servis çöktü'));
const basari = () => Promise.resolve('tamam');

describe('DevreKesici', () => {
  it('eşik kadar hatadan sonra açılır ve yedeğe geçer', async () => {
    let zaman = 0;
    const d = new DevreKesici('deneme', { esik: 3, beklemeMs: 1000, saat: () => zaman });
    for (let i = 0; i < 3; i++) await d.calistir(hata, () => 'yedek');
    expect(d.durum).toBe('ACIK');

    let cagrildi = false;
    const sonuc = await d.calistir(
      () => {
        cagrildi = true;
        return basari();
      },
      () => 'yedek',
    );
    expect(sonuc).toBe('yedek');
    expect(cagrildi).toBe(false); // devre açıkken servis hiç çağrılmaz
  });

  it('bekleme süresi dolunca yarı açık olur, başarıda kapanır', async () => {
    let zaman = 0;
    const d = new DevreKesici('deneme', { esik: 1, beklemeMs: 1000, saat: () => zaman });
    await d.calistir(hata, () => null);
    expect(d.durum).toBe('ACIK');
    zaman = 1500;
    expect(await d.calistir(basari)).toBe('tamam');
    expect(d.durum).toBe('KAPALI');
  });

  it('yarı açıkken başarısız deneme devreyi yeniden açar', async () => {
    let zaman = 0;
    const d = new DevreKesici('deneme', { esik: 1, beklemeMs: 1000, saat: () => zaman });
    await d.calistir(hata, () => null);
    zaman = 1500;
    await d.calistir(hata, () => null);
    expect(d.durum).toBe('ACIK');
  });

  it('durum değişikliklerini bildirir', async () => {
    const d = new DevreKesici('deneme', { esik: 1 });
    const gecisler = [];
    d.durumDegisti((x) => gecisler.push(x));
    await d.calistir(hata, () => null);
    expect(gecisler).toEqual(['ACIK']);
  });
});
