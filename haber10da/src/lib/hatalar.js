// Hata modeli: RFC 9457 "Problem Details" — tüm API hataları aynı biçimde döner.
// { type, title, status, detail, instance, ...ek }
export class ApiHatasi extends Error {
  constructor(durum, baslik, detay, ek = {}) {
    super(detay ?? baslik);
    this.durum = durum;
    this.baslik = baslik;
    this.ek = ek;
  }
}

export const bulunamadi = (ne = 'Kaynak') => new ApiHatasi(404, `${ne} bulunamadı`);
export const yetkisiz = (detay = 'Bu işlem için giriş yapmalısınız.') =>
  new ApiHatasi(401, 'Kimlik doğrulanamadı', detay);
export const yasak = (detay = 'Bu işlem için yetkiniz yok.') => new ApiHatasi(403, 'Erişim reddedildi', detay);
export const gecersiz = (detay, ek) => new ApiHatasi(400, 'Geçersiz istek', detay, ek);
export const cakisma = (detay) => new ApiHatasi(409, 'Çakışma', detay);
