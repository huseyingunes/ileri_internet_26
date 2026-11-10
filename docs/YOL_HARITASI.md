# haber10da ders yol haritası

**Ders:** İleri İnternet Programlama, 2026–2027 Güz
**Başlangıç noktası:** roadmap.sh/backend üzerinde API bloğu (REST, JSON API, OpenAPI) işlendi.
**Hedef:** 14 Ocak 2027, 12.00 — haber10da.net yayında (sitedeki geri sayımın sonu).

Her hafta yol haritasından bir blok işlenir ve o bloğun karşılığı sitede çalışan bir özellik olarak
gösterilir. Kod hazırdır; derste dosya dosya okunur, değiştirilir, kırılır, düzeltilir. Öğrenci
ödevleri aynı depoya çekme isteği (pull request) olarak gelir ve CI'dan geçmek zorundadır.

| Hafta | Tarih | Blok | Sitedeki karşılığı |
|---|---|---|---|
| 1 | 10–16 Kasım | Önbellekleme, kimlik doğrulama | Redis önbelleği, ETag/304, JWT + yenileme belirteci, GitHub ile giriş |
| 2 | 17–23 Kasım | Web güvenliği | CSP, CORS, bcrypt, XSS kaçışı, CSRF, hız sınırı |
| 3 | 24–30 Kasım | Test, CI/CD | Vitest + Supertest, GitHub Actions, otomatik dağıtım |
| 4 | 1–7 Aralık | Veritabanında derinleşme | Drizzle ORM, göçler, transaction, N+1, indeksler |
| 5 | 8–14 Aralık | Mimari, Docker, Nginx | Docker Compose, ters vekil, TLS, yatay ölçekleme |
| 6 | 15–21 Aralık | Gerçek zamanlı veri, arama, kuyruk, GraphQL | SSE son dakika, WebSocket okur sayısı, RabbitMQ worker, Elasticsearch, /graphql |
| 7 | 22–28 Aralık | Ölçek için inşa, yapay zekâ | Metrikler, devre kesici, özet, RAG asistanı, MCP sunucusu |
| — | 29 Aralık–13 Ocak | Proje haftaları | Öğrenci özellikleri, sunucuya kurulum, yayın |

---

## 1. hafta — Önbellekleme ve kimlik doğrulama

**Yol haritası düğümleri:** Caching (Server Side, Client Side, CDN), Redis, HTTP Caching, Authentication,
JWT, Cookie Based Auth, Token Authentication, OAuth, Basic Authentication

**Anlatım**
- Önbellek nerede durur: tarayıcı → CDN/vekil → uygulama (Redis) → veritabanı. Her katmanın bedeli ve tazelik sorunu.
- Cache-aside deseni; aynı anahtara eşzamanlı isteklerde tek üretim ("thundering herd").
- Geçersiz kılma: anahtar silmek yerine **sürümlü anahtar** (`v12:liste:...`).
- HTTP: `Cache-Control` (max-age, stale-while-revalidate, private/public), `ETag` + `If-None-Match` → 304.
- Oturum mu belirteç mi: çerez tabanlı oturum, JWT'nin yapısı (başlık.yük.imza), neden kısa ömürlü.
- Yenileme belirteci: httpOnly çerez, döndürme (rotation), yeniden kullanım tespiti.
- OAuth 2.0 yetkilendirme kodu akışı, `state` ve PKCE'nin neyi önlediği. Basic Auth'un yeri (/api/metrics).

**Canlı kodlama ve inceleme**
- `src/onbellek/index.js` — `onbellekle()`, `surumArtir()`; Redis'i kapatıp yedeğe düşmesini izle.
- `src/ara-katmanlar/httpOnbellek.js` — ETag hesapla, 304 döndür.
- `src/kimlik/belirtec.js` — JWT imzala/doğrula, `yenile()` içindeki transaction.
- `src/kimlik/github.js` + `src/rotalar/auth.js` — GitHub OAuth uygulaması açıp akışı tarayıcıda adım adım izle.

**Derste deney:** `/ders` sayfasında önbellek deneyi; tarayıcı geliştirici araçlarında `Server-Timing`, `X-Onbellek`, `ETag`.
`curl -i -H 'If-None-Match: ...'` ile 304. Eski yenileme çerezini tekrar göndererek oturumun düşmesini göster.

**Ödev:** Okur için "kaydedilen haberler": `POST/DELETE/GET /api/kaydedilenler`, yalnızca giriş yapmış kullanıcı,
yanıt `Cache-Control: private` ve ETag'li.

---

## 2. hafta — Web güvenliği

**Yol haritası düğümleri:** HTTPS, CORS, Content Security Policy, OWASP Risks, Hashing Algorithms (MD5, SHA, scrypt, bcrypt),
Server Security, Rate Limiting

**Anlatım**
- OWASP Top 10 üzerinden: enjeksiyon, kırık kimlik doğrulama, XSS, CSRF, güvenlik yapılandırma hataları.
- Parola özetleme: MD5/SHA neden uygun değil, tuz, maliyet faktörü, bcrypt'in 72 bayt sınırı.
- XSS: `html` şablon etiketinin otomatik kaçışı (`public/js/yardimci.js`), arama vurgusunun güvenli eklenmesi.
- CSP: `script-src 'self'` ile satır içi betiğin engellenmesi; satır içi `style` özniteliği de yasak → renkler CSSOM ile.
- CORS: ön uçuş (OPTIONS) isteği, `credentials`, izinli kaynaklar.
- CSRF: SameSite=Strict çerez + Origin denetimi.
- Hız sınırı: sabit pencere sayacı (Redis INCR + PEXPIRE), 429 + Retry-After, kaba kuvvete karşı e-posta bazlı anahtar.
- Hesap varlığını sızdırmama: aynı hata mesajı, sabit zamanlı karşılaştırma.

**Canlı kodlama ve inceleme:** `src/ara-katmanlar/guvenlik.js`, `hizSinirla.js`, `src/kimlik/parola.js`, `ara-katmanlar.js`

**Derste deney:** Bir haber başlığına `<img src=x onerror=alert(1)>` yazıp yayımla — metin olarak görünür.
CSP'yi kapatıp kaçışı kaldırarak aynı denemeyi tekrarla. `/ders` hız sınırı deneyi.

**Ödev:** Siteye karşı beş saldırı denemesi (XSS, SQL enjeksiyonu, CSRF, kaba kuvvet, büyük gövde) ve her biri için
hangi katmanın durdurduğunu gösteren kısa rapor.

---

## 3. hafta — Test ve sürekli entegrasyon

**Yol haritası düğümleri:** Testing (Unit, Integration, Functional), CI / CD

**Anlatım**
- Test piramidi; saf fonksiyonların birim testi, HTTP katmanının entegrasyon testi.
- Test veritabanı: her dosyaya bellekte temiz PGlite; CI'da ayrıca gerçek PostgreSQL/Redis servis konteynerleri.
- Dış servisleri sahtelemek: `tests/entegrasyon/yapayZeka.test.js` içindeki sahte OpenAI sunucusu.
- GitHub Actions: iş, adım, matris, servis konteyneri, gizler, ortamlar.
- Sürekli dağıtım: imaj etiketi = commit SHA, SSH ile çek-yeniden başlat, duman testi.

**Canlı kodlama ve inceleme:** `tests/birim/`, `tests/entegrasyon/`, `vitest.config.js`, `.github/workflows/deploy.yml`

**Derste deney:** `slugla()` fonksiyonuna kasıtlı hata ekle, testin yakaladığını göster; çekme isteğinde CI'ın kırmızıya döndüğünü göster.

**Ödev:** 1. haftanın "kaydedilenler" özelliği için entegrasyon testleri; CI yeşil olmadan birleştirme yok.

---

## 4. hafta — Veritabanında derinleşme

**Yol haritası düğümleri:** ORMs, Migrations, ACID, Transactions, N+1 Problem, Normalization, Database Indexes,
Profiling Performance, (kavram olarak) Failure Modes

**Anlatım**
- ORM'in sağladığı ve gizlediği şeyler; Drizzle şeması → SQL göç dosyası.
- Normalizasyon: yazar ve kategorinin habere kopyalanmaması (3NF), etiketlerin dizi alan olarak bilinçli denormalizasyonu.
- ACID ve transaction; `SELECT ... FOR UPDATE` ile yarış durumunun önlenmesi (yenileme belirteci).
- İndeks türleri: B-tree (bileşik `durum, yayin_tarihi`), GIN (tam metin), HNSW (vektör).
- N+1: döngüde sorgu vs ilişkisel sorgu; `EXPLAIN ANALYZE` ile plan okuma.

**Canlı kodlama ve inceleme:** `src/db/schema.js`, `drizzle/`, `src/servisler/haberServisi.js`, `src/rotalar/sistem.js`

**Derste deney:** `/ders` N+1 deneyi (1+2N sorgu vs 1 sorgu). `psql` ile indeksi silip `EXPLAIN ANALYZE` farkı.
Şemaya alan ekle → `npm run db:generate` → oluşan SQL'i oku → `npm run db:migrate`.

**Ödev:** Yorumlar tablosu: göç, ilişki, N+1'siz listeleme uç noktası ve indeksin etkisini gösteren `EXPLAIN` çıktısı.

---

## 5. hafta — Mimari, konteynerler ve web sunucusu

**Yol haritası düğümleri:** Architectural Patterns (Monolithic, Microservices, SOA, Serverless), Twelve-Factor Apps,
Containerization (Docker), Web Servers (Nginx), Scaling Databases (Replication, Sharding, CAP)

**Anlatım**
- Modüler monolit: haber10da tek uygulama + ayrı worker. Mikroservise ne zaman geçilir, bedeli nedir.
- 12 faktör: yapılandırma ortamda (`src/config.js`), süreçler durumsuz, günlük stdout'a, zarif kapanış.
- Docker: imaj, katman, çok aşamalı derleme, kök olmayan kullanıcı, HEALTHCHECK.
- Compose: servisler, ağ, birimler, `depends_on` + sağlık, profiller.
- Nginx: ters vekil, TLS, gzip, mikro önbellek, SSE için tamponsuzluk, WebSocket yükseltmesi, `limit_req`.
- Veritabanı ölçekleme (kavram): okuma çoğaltmaları, parçalama stratejileri, CAP üçgeni.

**Canlı kodlama ve inceleme:** `Dockerfile`, `docker-compose.yml`, `nginx/haber10da.conf`, `src/server.js` (kapanış)

**Derste deney:** `docker compose up -d --scale uygulama=3`; Nginx günlüğünde isteklerin dağılımı; bir uygulama
konteynerini öldürüp sitenin ayakta kaldığını göster. `X-Nginx-Onbellek: HIT`.

**Ödev:** Tüm sistemi kendi bilgisayarında Compose ile kaldırma ve ölçekleme raporu (ekran görüntüleriyle).

---

## 6. hafta — Gerçek zamanlı veri, arama, mesaj kuyrukları, GraphQL

**Yol haritası düğümleri:** Real-Time Data (Server Sent Events, WebSockets, Long/Short Polling), Search Engines
(Elasticsearch), Message Brokers (RabbitMQ, Kafka), GraphQL

**Anlatım**
- Kısa yoklama → uzun yoklama → SSE → WebSocket karşılaştırması.
- SSE ayrıntıları: olay biçimi, `Last-Event-ID`, kalp atışı, vekil tamponlaması; çok sunucuda Redis PUB/SUB.
- WebSocket: el sıkışma, odalar, ping/pong, üstel geri çekilmeli yeniden bağlanma.
- Tam metin arama: tsvector, Türkçe kök bulma, `websearch_to_tsquery`, `ts_headline`; Elasticsearch çözümleyicileri.
- Kuyruk: exchange, yönlendirme anahtarı, kalıcı mesaj, onay (ack), prefetch (geri basınç), ölü mektup kuyruğu.
  Kafka'nın günlük tabanlı modeliyle farkı (kavram).
- GraphQL: şema, çözümleyici, DataLoader ile N+1 çözümü; REST ile karşılaştırma.

**Canlı kodlama ve inceleme:** `src/canli/sse.js`, `src/canli/ws.js`, `src/kuyruk/index.js`, `src/isleyiciler/haberIsleyici.js`,
`src/arama/index.js`, `src/graphql/index.js`

**Derste deney:** Editör masasından son dakika yayımla → anasayfa şeridi ve `/ders` olay günlüğü anında güncellenir.
RabbitMQ yönetim arayüzünde (`localhost:15672`) kuyruğu izle; worker'ı durdur, mesajların biriktiğini göster.

**Ödev:** WebSocket oda sayımını Redis'e taşı (birden çok uygulama konteynerinde doğru sayım) ya da GraphQL'e
yorumlar alanı + DataLoader.

---

## 7. hafta — Ölçek için inşa ve yapay zekâ

**Yol haritası düğümleri:** Building for Scale (Observability, Monitoring, Telemetry, Instrumentation, Graceful Degradation,
Throttling, Backpressure, Circuit Breaker, Migration Strategies), AI (How LLMs Work, Embeddings, Vector Databases,
RAG, Prompting Techniques, Function Calling, Structured Outputs, Streaming, MCP, AI-Assisted Coding)

**Anlatım**
- Gözlemlenebilirlik üçlüsü: günlük (istek kimliği), metrik (Prometheus histogramı), iz (kavram).
- Canlılık vs hazır olma denetimi; zarif bozulma: her servisin yedeği (`/ders` bileşen tablosu).
- Devre kesici durumları ve neden gerekli olduğu.
- LLM'i OpenAI uyumlu API ile çağırma; sistem istemi, sıcaklık.
- Yapılandırılmış çıktı (JSON Şeması) + zod ile ikinci doğrulama.
- Gömme, kosinüs benzerliği, pgvector, HNSW; hibrit arama ve RRF.
- RAG + fonksiyon çağırma döngüsü, akışlı yanıt (stream), kaynak gösterme.
- MCP: haber10da'yı yapay zekâ istemcilerine araç olarak açmak.
- Yapay zekâ destekli kodlama: ajanla özellik geliştirme, insan incelemesinin yeri.

**Canlı kodlama ve inceleme:** `src/lib/devreKesici.js`, `src/lib/metrikler.js`, `src/ai/`, `src/mcp/server.js`

**Derste deney:** `LLM_BASE_URL` ile (OpenAI, Ollama ya da kendi vLLM sunucusu) asistanı çalıştır; araç günlüğünü göster.
Model adresini bozarak devrenin açılışını ve özetin çıkarımsal yedeğe düşüşünü izle. MCP sunucusunu Claude Code'a ekleyip
"haber10da'da kampüs haberleri neler?" diye sor.

**Ödev:** Asistana yeni araç (ör. `kategori_istatistigi`) ya da MCP sunucusuna yeni araç; sahte LLM ile testi.

---

## Proje haftaları (29 Aralık – 13 Ocak)

- Her öğrenci ya da takım siteye uçtan uca bir özellik ekler: veritabanı göçü + API + test + arayüz.
- Çekme isteği CI'dan geçmeli, kod incelemesinde öğrenci değişikliğini sözlü açıklamalı.
- Birleştirilen özellikler sürekli dağıtımla canlıya çıkar; 14 Ocak 12.00'de site yayında.

## Kavram düzeyinde kalan konular

Sitede kodu olmayan ama anlatılan konular: CAP teoremi, BASE, SOA, servis ağı (service mesh), Kubernetes,
sunucusuz mimari, Kafka, okuma çoğaltması ve parçalama, CDN, OpenTelemetry ile dağıtık izleme.
