import { describe, it, expect } from 'vitest';
import { slugla, kelimeSay, okumaSuresi, cikarimsalOzet, htmlTemizle, OZET_KELIME } from '../../src/lib/metin.js';

describe('slugla', () => {
  it('Türkçe karakterleri dönüştürür', () => {
    expect(slugla('Çağış Yerleşkesi’nde İlk Gün: Öğrenciler Şaşırdı!')).toBe('cagis-yerleskesinde-ilk-gun-ogrenciler-sasirdi');
  });
  it('baştaki ve sondaki tireleri atar, 80 karakterle sınırlar', () => {
    expect(slugla('  --Merhaba--  ')).toBe('merhaba');
    expect(slugla('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe('okuma süresi', () => {
  it('220 kelime yaklaşık 60 saniye', () => {
    expect(okumaSuresi('kelime '.repeat(220))).toBe(60);
  });
  it('en az 10 saniye döner', () => {
    expect(okumaSuresi('kısa')).toBe(10);
  });
});

describe('çıkarımsal özet', () => {
  const metin =
    'Kütüphane final haftasında 24 saat açık kalacak. Gece girişleri öğrenci kimliğiyle yapılacak. ' +
    'Grup çalışma odaları çevrim içi randevuyla kullanılabilecek. Kütüphane yönetimi öğrencilerden anlayış bekliyor. ' +
    'Ring seferleri de artırılacak.';

  it(`özet ${OZET_KELIME} kelimeyi belirgin biçimde aşmaz`, () => {
    expect(kelimeSay(cikarimsalOzet(metin))).toBeLessThanOrEqual(OZET_KELIME);
  });
  it('ilk cümleyle başlar', () => {
    expect(cikarimsalOzet(metin).startsWith('Kütüphane final haftasında')).toBe(true);
  });
  it('tekrar eden cümleyi atlar', () => {
    const ozet = cikarimsalOzet('Kapasite iki katına çıktı. Yeni düzenlemeyle kapasite iki katına çıktı. Park alanı kapalı.');
    expect(ozet).toBe('Kapasite iki katına çıktı. Park alanı kapalı.');
  });
});

describe('htmlTemizle', () => {
  it('etiketleri ve varlıkları temizler', () => {
    expect(htmlTemizle('<p>Merhaba&nbsp;<b>dünya</b> &amp; evren</p>')).toBe('Merhaba dünya & evren');
  });
});
