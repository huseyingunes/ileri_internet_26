// Türkçe metin yardımcıları: slug, kelime sayısı, okuma süresi, çıkarımsal özet.
const HARITA = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

export function slugla(metin) {
  return metin
    .toLocaleLowerCase('tr-TR')
    .replace(/['’‘`]/g, '') // kesme işareti kelimeyi bölmesin: Yerleşkesi'nde → yerleskesinde
    .replace(/[çğıiöşüâîû]/g, (h) => HARITA[h] ?? h)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export function kelimeSay(metin) {
  return (metin.match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

// Ortalama okuma hızı ~220 kelime/dk → saniye
export function okumaSuresi(metin) {
  return Math.max(10, Math.round((kelimeSay(metin) / 220) * 60));
}

// 10 saniyede okunacak uzunluk ≈ 35 kelime
export const OZET_KELIME = 35;

export function cumlelereBol(metin) {
  return metin
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+(?=[A-ZÇĞİÖŞÜ0-9"“])/u)
    .map((c) => c.trim())
    .filter(Boolean);
}

// Yapay zekâ yokken yedek: baştan cümle cümle ekleyerek ~35 kelimeyi aşmayan özet.
const kelimeler = (s) => new Set(s.toLocaleLowerCase('tr-TR').match(/[\p{L}\p{N}]+/gu) ?? []);

export function cikarimsalOzet(metin, sinir = OZET_KELIME) {
  const cumleler = cumlelereBol(metin);
  const secilen = [];
  const gorulen = new Set();
  let toplam = 0;
  for (const c of cumleler) {
    const k = kelimeSay(c);
    if (secilen.length && toplam + k > sinir) break;
    // Tekrar eden cümleyi atla: kelimelerinin %60'ı zaten seçilenlerde geçiyorsa yeni bilgi getirmiyor
    const ck = kelimeler(c);
    const ortak = [...ck].filter((w) => gorulen.has(w)).length;
    if (secilen.length && ortak / (ck.size || 1) > 0.6) continue;
    ck.forEach((w) => gorulen.add(w));
    secilen.push(c);
    toplam += k;
  }
  let ozet = secilen.join(' ');
  if (kelimeSay(ozet) > sinir + 10) {
    ozet = ozet.split(/\s+/).slice(0, sinir).join(' ').replace(/[,;:]$/, '') + '…';
  }
  return ozet;
}

export function htmlTemizle(metin = '') {
  return metin
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
