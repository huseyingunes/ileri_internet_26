// Parola özetleme: bcrypt. MD5/SHA-256 gibi hızlı özetler parola için UYGUN DEĞİLDİR —
// saldırgan saniyede milyarlarca deneme yapabilir. bcrypt kasıtlı olarak yavaştır (maliyet faktörü)
// ve her parolaya rastgele tuz (salt) ekler; aynı parolanın özetleri bile farklı çıkar.
import bcrypt from 'bcryptjs';
import { config } from '../config.js';

const MALIYET = config.testte ? 4 : 12; // 2^12 tur ≈ 250 ms

export const parolaOzetle = (parola) => bcrypt.hash(parola, MALIYET);
export const parolaDogrula = (parola, ozet) => (ozet ? bcrypt.compare(parola, ozet) : Promise.resolve(false));

// Zamanlama saldırısına karşı: kullanıcı yoksa bile sahte bir karşılaştırma yap,
// böylece "bu e-posta kayıtlı mı?" yanıt süresinden anlaşılamaz.
const SAHTE = bcrypt.hashSync('haber10da-sahte', MALIYET);
export const sahteDogrulama = () => bcrypt.compare('x', SAHTE);
