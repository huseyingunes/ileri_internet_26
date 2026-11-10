# İleri İnternet Programlama

Balıkesir Üniversitesi  
Mühendislik Fakültesi  
Bilgisayar Mühendisliği Bölümü

Bu depo, **İleri İnternet Programlama** dersinin 2026–2027 eğitim-öğretim yılı güz dönemi için hazırlanmıştır. Dönem boyunca paylaşılan örnekler, uygulama notları ve ders materyalleri burada tutulur.

## Dönem

| | |
| --- | --- |
| Üniversite | Balıkesir Üniversitesi |
| Fakülte | Mühendislik Fakültesi |
| Bölüm | Bilgisayar Mühendisliği |
| Ders | İleri İnternet Programlama |
| Dönem | 2026–2027 Güz |

Bölüm sayfası: [ceng.balikesir.edu.tr](https://ceng.balikesir.edu.tr/)

## Depo içeriği

| Klasör | İçerik |
| --- | --- |
| kök (`src/`, `public/` …) | **haber10da.net** — dönem boyunca geliştirilen haber sitesi (aşağıda) |
| `1_api_rest/` | REST API örnekleri |
| `2_authentication/` | Kimlik doğrulama örnekleri |
| `2_sinav/`, `3_sinav/` | Sınav sayfaları |

Ders klasörleri sitede eskisi gibi kendi adresinden açılır (ör. `haber10da.net/2_sinav/index.html`).

---

# haber10da.net

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

## Günlük haber ajanı

Her gün `ajan/kaynaklar.json` içindeki RSS kaynaklarından son 48 saatin haberlerini toplar, kategorileri dengeleyerek
seçer, dil modeli tanımlıysa her haberi yalnızca kaynaktaki bilgilerle yeniden yazar ve sitenin API'si üzerinden
editör hesabıyla ekleyip yayımlar. Her haberde kaynak adı ve bağlantısı görünür; aynı haber ikinci kez girilmez.

```bash
npm run ajan:hesap      # bir kez: ajan için editör hesabı açar, parolayı .env'ye yazar
npm run ajan:dene       # hiçbir şey yazmadan hangi haberleri seçeceğini gösterir
npm run ajan            # şimdi çalıştır
npm run ajan:zamanla    # Windows Görev Zamanlayıcı'ya her gün AJAN_SAAT (08:00) için kaydet
npm run ajan:zamanla -- --kaldir
```

Sunucu kapalıysa ajan onu geçici olarak başlatır, iş bitince kapatır. Çıktılar `.veri/ajan.log` dosyasına yazılır.
Ayarlar (`.env`): `AJAN_ADET` (varsayılan 6), `AJAN_YAYINLA` (`evet`/`hayir`; `hayir` ise taslak olarak girer),
`AJAN_SAAT`, `AJAN_API` (varsayılan `http://localhost:PORT`). Haberleri dil modeliyle yeniden yazdırmak için
`LLM_BASE_URL` tanımlı olmalı (ör. Ollama: `http://localhost:11434/v1`).

## Tüm sistem Docker ile

```bash
cp .env.example .env        # JWT_SECRET'ı doldurun: openssl rand -hex 32
docker compose up -d --build
docker compose --profile arama up -d      # + Elasticsearch
docker compose --profile izleme up -d     # + Prometheus (9090) + Grafana (3001)
docker compose up -d --scale uygulama=3   # yatay ölçekleme
```

### haber10da.net'e yayın

Sunucuda `/var/www/haber10da` bu deponun kopyasıdır ve `haber10da` systemd hizmeti kökteki `server.js` dosyasını
9874 portunda çalıştırır. `main` dalına her gönderimde `.github/workflows/deploy.yml`:

1. testleri ve kod denetimini çalıştırır,
2. geçerse sunucuda `git pull` ve `npm ci --omit=dev` yapar,
3. ilk dağıtımda üretim `.env` dosyasını sunucuda üretir (JWT anahtarı, yönetici ve metrik parolası, ajan ayarları),
4. hizmeti yeniden başlatır ve uygulamanın üretim ayarlarıyla açıldığını denetler.

Sunucuda veritabanı gömülü PGlite'tır (`.veri/` klasörü; `git pull` ona dokunmaz). Günlük haber ajanı uygulamanın
içinde her gün 08.00'de (Türkiye saati) çalışır. Yönetici parolası: `grep ADMIN_PAROLA /var/www/haber10da/.env`

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
claude mcp add haber10da -e HABER10DA_API=https://haber10da.net -- node C:/GitHub/ileri_internet_26/src/mcp/server.js
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

## Lisans

Bu depo [GNU Genel Kamu Lisansı v3](LICENSE) ile lisanslanmıştır.
