# haber10da

**haber10da.net** — her haberin 10 saniyede okunacak özetiyle yayın yapan haber sitesi.
Balıkesir Üniversitesi Bilgisayar Mühendisliği, İleri İnternet Programlama dersinde
[roadmap.sh/backend](https://roadmap.sh/backend) yol haritasının API'lerden sonraki konularını
uygulayarak öğretmek için yazıldı. Haftalık plan: [docs/YOL_HARITASI.md](docs/YOL_HARITASI.md)

## Hızlı başlangıç (kurulum gerektirmez)

```bash
npm install
npm run dev
```

http://localhost:3000 açılır. Veritabanı, önbellek, kuyruk kurmanız gerekmez:

| Bileşen | Tanımlı değilse | Tanımlıysa |
|---|---|---|
| `DATABASE_URL` | PGlite — WebAssembly PostgreSQL, `./.veri` klasöründe | PostgreSQL + pgvector |
| `REDIS_URL` | Bellek içi önbellek | Redis |
| `AMQP_URL` | Süreç içi kuyruk | RabbitMQ + ayrı worker |
| `ELASTIC_URL` | PostgreSQL tam metin arama | Elasticsearch |
| `LLM_BASE_URL` | Çıkarımsal özet + yerel gömme | OpenAI uyumlu model (OpenAI, vLLM, Ollama…) |

Geliştirme hesapları: `editor@haber10da.net / editor1234`, `admin@haber10da.net / admin1234`.

## Komutlar

| Komut | İş |
|---|---|
| `npm run dev` | Sunucuyu değişiklikleri izleyerek başlatır |
| `npm run worker` | Kuyruk işçisi (RabbitMQ varsa) + RSS toplayıcı |
| `npm test` | Birim + entegrasyon testleri (gömülü veritabanıyla) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Şema değişikliğinden SQL göç dosyası üretir |
| `npm run db:migrate` | Göçleri uygular |
| `npm run db:sifirla` | Veritabanını örnek içerikle baştan kurar |
| `npm run rss` | RSS kaynaklarını bir kez toplar |
| `npm run mcp` | MCP sunucusu (yapay zekâ istemcileri için) |

## Tüm sistem Docker ile

```bash
cp .env.example .env        # JWT_SECRET'ı doldurun: openssl rand -hex 32
docker compose up -d --build
docker compose --profile arama up -d      # + Elasticsearch
docker compose --profile izleme up -d     # + Prometheus (9090) + Grafana (3001)
docker compose up -d --scale uygulama=3   # yatay ölçekleme
```

### Sunucuya ilk kurulum (haber10da.net)

```bash
# DNS: haber10da.net ve www → sunucu IP
git clone <depo> ~/haber10da && cd ~/haber10da
cp .env.example .env   # SITE_URL=https://haber10da.net, JWT_SECRET, ADMIN_PAROLA, POSTGRES_PAROLA, RABBIT_PAROLA
NGINX_SITE=ilk-kurulum.conf docker compose up -d --build
docker compose --profile tls run --rm certbot
docker compose up -d nginx      # TLS'li yapılandırmaya geç
```

Sonraki her `main` gönderiminde GitHub Actions testleri çalıştırır, imajı `ghcr.io`'ya iter ve
sunucuyu günceller (`.github/workflows/dagitim.yml`; gizler: `SUNUCU_ADRES`, `SUNUCU_KULLANICI`, `SUNUCU_SSH_ANAHTARI`).

## Adresler

| Yol | Ne |
|---|---|
| `/` | Site |
| `/ders` | Bileşen durumu, canlı deneyler, ders planı |
| `/api/belgeler` | Swagger UI (OpenAPI 3.1) |
| `/graphql` | GraphQL (GraphiQL arayüzü) |
| `/api/canli/akis` | Server-Sent Events akışı |
| `/ws` | WebSocket |
| `/api/metrics` | Prometheus metrikleri (HTTP Basic) |
| `/api/saglik`, `/api/hazir` | Canlılık ve hazır olma denetimleri |

## MCP sunucusu

haber10da'yı Claude Code, Claude Desktop veya Cursor'a araç olarak ekler:

```bash
claude mcp add haber10da -e HABER10DA_API=https://haber10da.net -- node /tam/yol/haber10da/src/mcp/server.js
```

Araçlar: `son_haberler`, `haber_ara`, `haber_oku`; kaynak: `haber10da://kategoriler`.

## Klasör yapısı

```
src/
  server.js, worker.js      giriş noktaları
  app.js                    Express ara katman sırası
  config.js                 ortam değişkenleri (zod ile doğrulanır)
  db/                       Drizzle şeması, göçler, tohum verisi
  servisler/                iş mantığı (REST ve GraphQL ortak kullanır)
  rotalar/                  REST uç noktaları
  kimlik/                   JWT, yenileme belirteci, bcrypt, GitHub OAuth, RBAC
  ara-katmanlar/            güvenlik, CORS, hız sınırı, HTTP önbellek, hata işleyici
  onbellek/                 Redis / bellek içi
  kuyruk/                   RabbitMQ / süreç içi
  arama/                    PostgreSQL FTS / Elasticsearch / hibrit (RRF)
  canli/                    SSE ve WebSocket
  ai/                       LLM istemcisi, özet, gömme, asistan
  graphql/                  şema + DataLoader
  mcp/                      MCP sunucusu
  isleyiciler/              kuyruk işleri
  rss/                      RSS toplayıcı
public/                     ön yüz (çatısız, ES modülleri)
tests/                      birim/ ve entegrasyon/
nginx/, izleme/             ters vekil ve Prometheus yapılandırması
drizzle/                    SQL göç dosyaları
```
