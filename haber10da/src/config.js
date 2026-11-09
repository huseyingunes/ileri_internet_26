// Uygulama yapılandırması — 12 faktör ilkesi III: yapılandırma ortam değişkenlerinde tutulur.
// Tüm değişkenler tek yerde zod ile doğrulanır; hatalı değer varsa uygulama hiç açılmaz.
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

try {
  process.loadEnvFile(); // .env varsa yükle (Node 22+ yerleşik)
} catch {
  /* .env dosyası yok; ortam değişkenleri doğrudan kullanılır */
}

z.config(z.locales.tr()); // doğrulama hata mesajları Türkçe

const bos = (v) => (v === '' ? undefined : v);
const istegeBagli = z.preprocess(bos, z.string().optional());

const sema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  SITE_URL: istegeBagli,
  LOG_LEVEL: z.string().default('info'),

  // Veritabanı: boşsa gömülü PGlite (WASM PostgreSQL) kullanılır — kurulum gerektirmez.
  DATABASE_URL: istegeBagli,
  PGLITE_DIR: z.string().default('./.veri/pglite'),

  // İsteğe bağlı servisler: tanımlı değilse bellek içi yedek çalışır (zarif bozulma).
  REDIS_URL: istegeBagli,
  AMQP_URL: istegeBagli,
  ELASTIC_URL: istegeBagli,

  // Kimlik doğrulama
  JWT_SECRET: istegeBagli,
  JWT_ERISIM_SURESI: z.string().default('15m'),
  YENILEME_GUN: z.coerce.number().default(7),
  GITHUB_CLIENT_ID: istegeBagli,
  GITHUB_CLIENT_SECRET: istegeBagli,
  METRIK_KULLANICI: z.string().default('izleme'),
  METRIK_PAROLA: istegeBagli,
  CORS_KAYNAKLARI: z.string().default(''),

  // Yapay zekâ — OpenAI uyumlu her uç nokta (OpenAI, vLLM, Ollama, Gemini, OpenRouter...)
  LLM_BASE_URL: istegeBagli,
  LLM_API_KEY: istegeBagli,
  LLM_MODEL: z.string().default('gpt-4o-mini'),
  EMBED_BASE_URL: istegeBagli,
  EMBED_MODEL: z.string().default('text-embedding-3-small'),
  EMBED_BOYUT: z.coerce.number().int().default(768),

  // Tohum verisi
  ADMIN_EPOSTA: z.string().default('admin@haber10da.net'),
  ADMIN_PAROLA: istegeBagli,

  RSS_KAYNAKLARI: z.string().default(''),
});

const sonuc = sema.safeParse(process.env);
if (!sonuc.success) {
  console.error('Yapılandırma hatası:', z.prettifyError(sonuc.error));
  process.exit(1);
}

const e = sonuc.data;

if (e.NODE_ENV === 'production' && !e.JWT_SECRET) {
  console.error('Üretim ortamında JWT_SECRET zorunludur.');
  process.exit(1);
}

export const config = {
  ...e,
  SITE_URL: (e.SITE_URL ?? `http://localhost:${e.PORT}`).replace(/\/$/, ''),
  uretimde: e.NODE_ENV === 'production',
  testte: e.NODE_ENV === 'test',
  // Geliştirmede her açılışta rastgele gizli anahtar: oturumlar yeniden başlatınca düşer.
  JWT_SECRET: e.JWT_SECRET ?? randomBytes(32).toString('hex'),
  llmAcik: Boolean(e.LLM_BASE_URL),
  githubAcik: Boolean(e.GITHUB_CLIENT_ID && e.GITHUB_CLIENT_SECRET),
  corsKaynaklari: e.CORS_KAYNAKLARI.split(',').map((s) => s.trim()).filter(Boolean),
};
