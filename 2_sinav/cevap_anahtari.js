// =====================================================================
// CEVAP ANAHTARI — Bu dosya sınav sayfası (index.html) tarafından
// YÜKLENMEZ ve öğrencilere verilen klasörde BULUNMAMALIDIR.
// Çoktan seçmeli: doğru seçeneğin sıra numarası (0 tabanlı dizin).
// Eşleştirme: soldaki her öge için sağdaki doğru açıklamanın harfi.
// Kısa cevap: kabul edilebilir yanıtlar.
// =====================================================================

const CEVAP_ANAHTARI = {
  // Bölüm A — Çoktan seçmeli (0 tabanlı dizin; harf karşılığı yanda)
  1:  { dogru: 3, harf: "D" },  // DNS
  2:  { dogru: 2, harf: "C" },  // DELETE
  3:  { dogru: 0, harf: "A" },  // git commit
  4:  { dogru: 1, harf: "B" },  // MongoDB
  5:  { dogru: 0, harf: "A" },  // Şifreleme + kimlik doğrulama
  6:  { dogru: 3, harf: "D" },  // Başlık – Yük – İmza
  7:  { dogru: 2, harf: "C" },  // Bellekte tutma
  8:  { dogru: 4, harf: "E" },  // Tutarlılık – Erişilebilirlik
  9:  { dogru: 1, harf: "B" },  // Claude Code
  10: { dogru: 3, harf: "D" },  // Maliyet etmeniyle kasıtlı yavaşlık
  11: { dogru: 0, harf: "A" },  // JOIN / istekli yükleme
  12: { dogru: 4, harf: "E" },  // Sınırlı deneme ile yoklama
  13: { dogru: 1, harf: "B" },  // 304 gövdesiz
  14: { dogru: 3, harf: "D" },  // Kalıcı günlük + ofset
  15: { dogru: 2, harf: "C" },  // "Her zaman JSON döner" ifadesi yanlış

  // Bölüm B — Kısa cevap (kabul edilebilir yanıtlar)
  16: ["HTML"],
  17: ["Go", "Golang"],
  18: ["ters vekil", "reverse proxy", "ters proxy"],
  19: ["WebSocket", "WebSockets"],
  20: ["git clone"],
  21: ["SSE", "Server-Sent Events", "sunucu kaynaklı olaylar"],
  22: ["atomiklik", "atomicity", "bölünmezlik"],
  23: ["AMQP"],
  24: ["bellek sertliği", "memory hardness", "bellek sert"],
  25: ["ORM"],
  26: ["OPTIONS"],
  27: ["ters dizin", "inverted index", "tersine dizin"],
  28: ["geri basınç", "backpressure", "geri baskı"],
  29: ["nihai tutarlılık", "eventual consistency", "nihai tutarlilik"],
  30: ["izler", "iz", "dağıtık izleme", "tracing", "trace"],

  // Bölüm C — Eşleştirme (sol öge sırasına göre doğru harfler)
  31: ["d", "b", "e", "f", "a", "c"],       // 201,204,304,401,403,429
  32: ["f", "d", "c", "b", "e", "a"],       // MD5,SHA-256,SHA-1,bcrypt,scrypt,HMAC
  33: ["c", "f", "e", "b", "d", "a"],       // JWT,OAuth,Basic,Çerez,OIDC,SAML
  34: ["c", "e", "d", "a", "b"],            // REST,GraphQL,gRPC,SOAP,OpenAPI
  35: ["c", "f", "e", "a", "b", "g", "d"],  // MongoDB,Neo4j,InfluxDB,ClickHouse,Cassandra,SQLite,Memcached
  36: ["d", "a", "e", "f", "b", "c"],       // Zarif bozulma,Kısıtlama,Devre kesici,Yük kaydırma,Hizmet ağı,Sunucusuz
  37: ["b", "d", "f", "e", "a", "c"],       // Normalleştirme,Parçalama,Çoğaltma,Dizin,Geçiş,İşlem
  38: ["a", "b", "c", "d", "e", "f"],       // Nginx,Apache,Caddy,IIS,TLS sonlandırma,Yük dengeleme
  39: ["c", "f", "a", "d", "e", "b"],       // XSS,CSRF,SQLi,MITM,Kaba kuvvet,Oturum çalma
  40: ["c", "b", "d", "e", "a"],            // Enstrümantasyon,İzleme,Telemetri,Profil,Günlükleme

  // Bölüm D (41–45) ve Bölüm E (46–50): açık uçlu — dereceli
  // puanlama anahtarıyla (rubrik) elle ya da ayrı bir sistemle okunur.
  41: { beklenen: "Kod tüm ortamlarda aynıdır; ortamlar arası (geliştirme/üretim) farklılıklar ve gizli bilgiler koddan ayrılır, depoya gizli bilgi sızmaz, dağıtım yeniden derleme gerektirmez." },
  42: { beklenen: "İdempotent istek kaç kez yinelenirse yinelensin sonuç aynı kalır; bu yüzden PUT güvenle yeniden denenebilirken POST'un yinelenmesi aynı kaydı birden çok kez oluşturabilir." },
  43: { beklenen: "Küçük ekip, erken aşama, belirsiz alan sınırları ve düşük ölçek gereksinimi varken tekparça tercih edilir; tek dağıtım birimi geliştirme, hata ayıklama ve işletimi basitleştirir." },
  44: { beklenen: "Senkron çoğaltma veri kaybı riskini sıfırlar ama yazma gecikmesini artırır; asenkron çoğaltma yazmayı hızlandırır ama ani arızada son yazılanların kaybına ve bayat okumalara yol açabilir." },
  45: { beklenen: "Her istek gerekli tüm bağlamı kendinde taşıdığından herhangi bir sunucu kopyası isteği karşılayabilir; yapışkan oturum veya ortak oturum deposu gerekmeden sunucu sayısı artırılabilir." },
  46: { beklenen: "Nginx 80/443'te trafiği karşılar; TLS burada sonlandırılır (sertifika yönetimi tek yerde, Node şifreleme yükünden kurtulur), statik dosyalar olay güdümlü mimariyle doğrudan sunulur (Node'a gitmekten çok daha verimli), dinamik istekler ters vekille iç ağdaki Node sürecine (ör. 3000) iletilir; bu düzen yük dengeleme, sıkıştırma, hız sınırlama ve birden çok siteyi barındırma olanağı kazandırır." },
  47: { beklenen: "Cache-aside: önce Redis'e bakılır, yoksa veritabanından çekilip TTL ile Redis'e yazılır; HTTP katmanında kısa max-age + ETag ile 304 koşullu yanıtlar kullanılır. Haber güncellendiğinde ilgili Redis anahtarları silinir (ya da sürümlü anahtar kullanılır) ve içerik değiştiği için ETag değişir; kısa max-age dolduğunda istemciler yeni ETag ile taze içeriği alır. CDN varsa purge da eklenir." },
  48: { beklenen: "Kafka iletileri kalıcı bir günlükte tutar, tüketiciler ofsetle okur ve geçmiş yeniden oynatılabilir: olay kaynaklı mimari, akış işleme, çok tüketicili yüksek hacim için uygundur. RabbitMQ kuyruk/yönlendirme (exchange, routing key) modeliyle iş dağıtımı, karmaşık yönlendirme, iş kuyruğu ve görev onayı (ack) senaryolarında uygundur. Yeniden oynatma ve yüksek hacimli olay akışı → Kafka; klasik görev kuyruğu ve ince yönlendirme → RabbitMQ." },
  49: { beklenen: "Oturum: durum sunucuda, anında iptal edilebilir, HttpOnly çerezle XSS'e karşı daha korunaklı ama CSRF önlemi (SameSite) gerekir ve ölçeklemede ortak oturum deposu (Redis) ister. JWT: durumsuz, yatay ölçekleme kolay, ancak süresi dolmadan iptal zordur (kara liste/kısa ömür + yenileme belirteci) ve belirteç JavaScript'ten erişilebilir yerde saklanırsa XSS riski taşır. Tarayıcı tabanlı klasik uygulamada oturum, çok sunuculu API/mobil senaryoda JWT tercih edilir." },
  50: { beklenen: "Okuma ağırlıklı küresel sistemde bölgelere dağıtılmış okuma kopyaları (çoğaltma) kullanılır; yazmalar tek birincil bölgeye ya da anahtara göre parçalanmış bölgesel birincillere gider. Ağ bölünmesi olasılığına karşı erişilebilirlik öncelenir ve okumalarda nihai tutarlılık kabul edilir (CAP'te AP eğilimi); kullanıcı verisi coğrafi anahtara göre parçalanır, bölge içi senkron, bölgeler arası asenkron çoğaltma yapılır. Kendi yazdığını okuma gibi gereksinimler oturum düzeyinde tutarlılıkla çözülür." }
};

// Node.js tarafında (sunucu) da kullanılabilmesi için:
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CEVAP_ANAHTARI };
}
