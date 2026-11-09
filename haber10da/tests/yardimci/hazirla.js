// Entegrasyon testleri için uygulamayı temiz veritabanıyla hazırlar.
import { veritabaniBaglan, veritabaniKapat } from '../../src/db/index.js';
import { gocleriUygula } from '../../src/db/migrate.js';
import { tohumla } from '../../src/db/seed.js';
import { onbellek, onbellekBaglan } from '../../src/onbellek/index.js';
import { kuyruk } from '../../src/kuyruk/index.js';
import { isleyicileriKaydet } from '../../src/isleyiciler/haberIsleyici.js';
import { uygulamaOlustur } from '../../src/app.js';

export async function uygulamaHazirla() {
  await veritabaniBaglan();
  await gocleriUygula();
  await tohumla({ sifirla: true, sessiz: true });
  await onbellekBaglan();
  if (onbellek.tur === 'redis') await onbellek.r.flushdb(); // önceki koşunun hız sınırı sayaçları kalmasın
  await isleyicileriKaydet(kuyruk);
  return uygulamaOlustur();
}

export async function kapat() {
  await onbellek.kapat();
  await veritabaniKapat();
}

export const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
