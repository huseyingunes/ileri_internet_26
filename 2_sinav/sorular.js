// =====================================================================
// İleri İnternet Programlama — 2. Sınav Soru Verisi
// Kaynak: roadmap.sh/backend yol haritası (mor / yeşil / gri işaretli konular)
// Zorluk dağılımı: 10 kolay, 10 normal, 10 zor, 10 çok zor, 10 çok çok zor
// Tür dağılımı: 15 çoktan seçmeli, 15 kısa cevap, 10 eşleştirme,
//               5 kısa açıklama (1-2 cümle), 5 açıklamalı (1-2 paragraf)
// Not: Bu dosyada doğru cevap BULUNMAZ; cevap anahtarı ayrı dosyadadır
//      ve sayfa tarafından yüklenmez.
// =====================================================================

const SORULAR = [

  // ================= BÖLÜM A — ÇOKTAN SEÇMELİ (1–15) =================

  {
    no: 1, tur: "coktan_secmeli", zorluk: "kolay", konu: "İnternet Temelleri",
    soru: "Bir alan adını (örneğin baun.edu.tr) karşılık geldiği IP adresine çeviren sistem aşağıdakilerden hangisidir?",
    secenekler: ["DHCP", "FTP", "TLS", "DNS", "HTTP"]
  },
  {
    no: 2, tur: "coktan_secmeli", zorluk: "kolay", konu: "REST",
    soru: "REST mimarisine uygun bir API'de var olan bir kaynağı silmek için kullanılması gereken HTTP fiili hangisidir?",
    secenekler: ["PATCH", "POST", "DELETE", "GET", "PUT"]
  },
  {
    no: 3, tur: "coktan_secmeli", zorluk: "kolay", konu: "Git",
    soru: "Git'te hazırlama alanına (staging) alınmış değişiklikleri yerel depoya kalıcı olarak kaydeden komut hangisidir?",
    secenekler: ["git commit", "git push", "git add", "git fetch", "git clone"]
  },
  {
    no: 4, tur: "coktan_secmeli", zorluk: "kolay", konu: "Veritabanları",
    soru: "Aşağıdakilerden hangisi ilişkisel bir veritabanı yönetim sistemi DEĞİLDİR?",
    secenekler: ["Oracle", "MongoDB", "MySQL", "MariaDB", "MS SQL Server"]
  },
  {
    no: 5, tur: "coktan_secmeli", zorluk: "kolay", konu: "HTTPS",
    soru: "HTTPS'in düz HTTP'ye göre sağladığı temel katkı aşağıdakilerden hangisidir?",
    secenekler: [
      "İletişimin şifrelenmesi ve sunucu kimliğinin doğrulanması",
      "Sayfaların daha hızlı yüklenmesi",
      "Yanıt gövdelerinin otomatik sıkıştırılması",
      "İsteklerin tarayıcıda önbelleğe alınması",
      "Alan adının IP adresine çevrilmesi"
    ]
  },
  {
    no: 6, tur: "coktan_secmeli", zorluk: "normal", konu: "JWT",
    soru: "Bir JSON Web Token (JWT), nokta ile ayrılmış hangi üç bölümden oluşur?",
    secenekler: [
      "Başlık – Gövde – Altbilgi",
      "Anahtar – Değer – Özet",
      "Kimlik – Parola – Belirteç",
      "Başlık – Yük – İmza",
      "Yük – Tuz – Özet"
    ]
  },
  {
    no: 7, tur: "coktan_secmeli", zorluk: "normal", konu: "Redis",
    soru: "Redis'in okuma ve yazma gecikmelerini milisaniyenin altına indiren temel tasarım özelliği hangisidir?",
    secenekler: [
      "Sütun yönelimli depolama kullanması",
      "B-ağacı dizinleriyle çalışması",
      "Verileri diskte değil bellekte tutması",
      "Yazma öncesi günlükleme yapması",
      "Belge tabanlı veri modeli sunması"
    ]
  },
  {
    no: 8, tur: "coktan_secmeli", zorluk: "normal", konu: "CAP Teoremi",
    soru: "CAP teoremine göre, ağ bölünmesi (partition) yaşayan dağıtık bir sistem hangi iki özellikten birini feda etmek zorundadır?",
    secenekler: [
      "Güvenlik – Hız",
      "Atomiklik – Yalıtım",
      "Ölçeklenebilirlik – Dayanıklılık",
      "Bütünlük – Gizlilik",
      "Tutarlılık – Erişilebilirlik"
    ]
  },
  {
    no: 9, tur: "coktan_secmeli", zorluk: "normal", konu: "Yapay Zekâ Destekli Geliştirme",
    soru: "Aşağıdakilerden hangisi terminalden çalışan ve ajan yaklaşımıyla kod tabanında çok adımlı görevleri kendi başına yürütebilen yapay zekâ destekli geliştirme aracıdır?",
    secenekler: ["GitHub Copilot", "Claude Code", "Cursor", "ESLint", "Prettier"]
  },
  {
    no: 10, tur: "coktan_secmeli", zorluk: "normal", konu: "Parola Güvenliği",
    soru: "Kullanıcı parolalarını saklamak için SHA-256 yerine bcrypt tercih edilmesinin temel nedeni nedir?",
    secenekler: [
      "bcrypt'in daha kısa özet üretmesi",
      "SHA-256'nın kırılmış olması",
      "bcrypt'in özetten parolayı geri çözebilmesi",
      "bcrypt'in maliyet etmeniyle kasıtlı olarak yavaşlatılabilmesi",
      "SHA-256'nın tuz (salt) desteklememesi"
    ]
  },
  {
    no: 11, tur: "coktan_secmeli", zorluk: "zor", konu: "N+1 Sorunu",
    soru: "Bir ORM ile \"tüm siparişleri listele, her siparişin müşteri adını yazdır\" işlemi; siparişler için 1 sorgu, ardından her sipariş için ayrı 1 müşteri sorgusu üretmektedir. Bu N+1 sorununun doğru çözümü hangisidir?",
    secenekler: [
      "İlişkiyi birleştirme (JOIN) ya da istekli yükleme (eager loading) ile tek sorguda çekmek",
      "Sorguları ayrı iş parçacıklarında eşzamanlı koşturmak",
      "Veritabanı dizinlerini kaldırmak",
      "Her sorgudan sonra bağlantıyı kapatıp yeniden açmak",
      "Sonuç kümesini XML biçimine çevirmek"
    ]
  },
  {
    no: 12, tur: "coktan_secmeli", zorluk: "zor", konu: "Devre Kesici",
    soru: "Devre kesici (circuit breaker) kalıbında \"yarı açık\" (half-open) durumun işlevi nedir?",
    secenekler: [
      "Tüm istekleri kalıcı olarak reddetmek",
      "İstekleri iki hizmete birden göndererek sonuçları karşılaştırmak",
      "Zaman aşımı süresini iki katına çıkarmak",
      "Hataları günlüğe yazıp istekleri aynen geçirmek",
      "Sınırlı sayıda deneme isteğine izin vererek hizmetin toparlanıp toparlanmadığını yoklamak"
    ]
  },
  {
    no: 13, tur: "coktan_secmeli", zorluk: "zor", konu: "HTTP Önbellekleme",
    soru: "Tarayıcı, tazelik süresi dolan bir yanıt için elindeki ETag değerini If-None-Match başlığıyla sunucuya gönderiyor ve sunucudaki içerik değişmemiş. Sunucunun vermesi gereken en doğru yanıt hangisidir?",
    secenekler: [
      "200 durum kodu ve tam gövde",
      "304 durum kodu ve gövdesiz yanıt",
      "301 durum kodu ve yeni adres",
      "404 durum kodu",
      "410 durum kodu"
    ]
  },
  {
    no: 14, tur: "coktan_secmeli", zorluk: "zor", konu: "İleti Aracıları",
    soru: "Kafka'yı klasik ileti kuyruklarından (örneğin RabbitMQ) ayıran temel özellik aşağıdakilerden hangisidir?",
    secenekler: [
      "İletilerin tüketildiği anda silinmesi",
      "Yalnızca tek tüketici desteklemesi",
      "XML tabanlı bir protokol kullanması",
      "İletilerin kalıcı bir günlükte tutulması ve tüketici gruplarının kendi ofsetleriyle geçmişi yeniden okuyabilmesi",
      "Yalnızca eşzamanlı (senkron) çağrı desteklemesi"
    ]
  },
  {
    no: 15, tur: "coktan_secmeli", zorluk: "zor", konu: "gRPC",
    soru: "gRPC ile ilgili aşağıdaki ifadelerden hangisi YANLIŞTIR?",
    secenekler: [
      "Taşıma katmanında HTTP/2 kullanır",
      "Hizmet sözleşmesi .proto dosyasında tanımlanır",
      "Yanıtlarını her zaman JSON gövdeyle döndürür",
      "Veriler Protocol Buffers ile ikili biçimde taşınır",
      "Çift yönlü akış (bidirectional streaming) destekler"
    ]
  },

  // ================= BÖLÜM B — KISA CEVAP (16–30) =================
  // Tek ya da iki kelimelik cevaplar

  {
    no: 16, tur: "kisa_cevap", zorluk: "kolay", konu: "HTML",
    soru: "Bir web sayfasının yapısını ve iskeletini tanımlayan işaretleme dilinin adı nedir?"
  },
  {
    no: 17, tur: "kisa_cevap", zorluk: "kolay", konu: "Programlama Dilleri",
    soru: "Google tarafından geliştirilen ve \"goroutine\" adı verilen hafif eşzamanlılık birimleriyle bilinen backend programlama dili hangisidir?"
  },
  {
    no: 18, tur: "kisa_cevap", zorluk: "kolay", konu: "Nginx",
    soru: "Nginx'in bir Node.js uygulamasının önünde dış istekleri karşılayıp arkadaki uygulamaya iletirken üstlendiği klasik rolün adı nedir? (iki kelime)"
  },
  {
    no: 19, tur: "kisa_cevap", zorluk: "kolay", konu: "Gerçek Zamanlı İletişim",
    soru: "İstemci ile sunucu arasında tek bağlantı üzerinden çift yönlü ve kalıcı iletişim sağlayan protokolün adı nedir?"
  },
  {
    no: 20, tur: "kisa_cevap", zorluk: "kolay", konu: "Git",
    soru: "Uzak bir Git deposunu tüm sürüm geçmişiyle birlikte yerel makineye kopyalayan komut nedir? (iki kelime)"
  },
  {
    no: 21, tur: "kisa_cevap", zorluk: "normal", konu: "Server-Sent Events",
    soru: "Sunucudan tarayıcıya tek yönlü ve sürekli olay akışı sağlayan HTTP tabanlı tekniğin kısaltması nedir?"
  },
  {
    no: 22, tur: "kisa_cevap", zorluk: "normal", konu: "ACID",
    soru: "Veritabanı işlemlerinin ACID güvencelerindeki \"A\" harfinin karşılığı olan özellik nedir?"
  },
  {
    no: 23, tur: "kisa_cevap", zorluk: "normal", konu: "RabbitMQ",
    soru: "RabbitMQ'nun uyguladığı standart ileti kuyruğu protokolünün kısaltması nedir?"
  },
  {
    no: 24, tur: "kisa_cevap", zorluk: "normal", konu: "scrypt",
    soru: "scrypt'i GPU ve özel donanım (ASIC) saldırılarına karşı dirençli kılan, hesaplamanın bol bellek tüketmesine dayanan özelliğinin adı nedir? (iki kelime)"
  },
  {
    no: 25, tur: "kisa_cevap", zorluk: "normal", konu: "ORM",
    soru: "Programdaki nesneleri ilişkisel veritabanı tablolarıyla eşleyen araç katmanının üç harfli kısaltması nedir?"
  },
  {
    no: 26, tur: "kisa_cevap", zorluk: "zor", konu: "CORS",
    soru: "CORS düzeneğinde tarayıcının, basit olmayan isteklerden önce sunucuya gönderdiği ön kontrol (preflight) isteğinde kullandığı HTTP fiili hangisidir?"
  },
  {
    no: 27, tur: "kisa_cevap", zorluk: "zor", konu: "Elasticsearch",
    soru: "Elasticsearch'ün tam metin aramayı hızlandırmak için kullandığı, her terimi o terimi içeren belgelere eşleyen temel veri yapısının adı nedir? (iki kelime)"
  },
  {
    no: 28, tur: "kisa_cevap", zorluk: "zor", konu: "Dayanıklılık",
    soru: "Aşırı yüklenen tüketicinin, üreticiden gelen veri akış hızını kendi işleme kapasitesine göre yavaşlatmasını sağlayan dayanıklılık kavramının adı nedir? (iki kelime)"
  },
  {
    no: 29, tur: "kisa_cevap", zorluk: "zor", konu: "Cassandra",
    soru: "Cassandra gibi lidersiz dağıtık veritabanlarının benimsediği, güncellemelerin zaman içinde tüm kopyalara yayılmasına dayanan tutarlılık modelinin adı nedir? (iki kelime)"
  },
  {
    no: 30, tur: "kisa_cevap", zorluk: "zor", konu: "Gözlemlenebilirlik",
    soru: "Gözlemlenebilirliğin (observability) günlükler ve metriklerle birlikte anılan üçüncü direği nedir?"
  },

  // ================= BÖLÜM C — EŞLEŞTİRME (31–40) =================
  // Soldaki her ögeyi sağdaki açıklamalardan uygun olanla eşleştiriniz.

  {
    no: 31, tur: "eslestirme", zorluk: "çok zor", konu: "HTTP Durum Kodları",
    soru: "Aşağıdaki HTTP durum kodlarını anlamlarıyla eşleştiriniz.",
    sol: ["201", "204", "304", "401", "403", "429"],
    sag: [
      "Kimlik doğrulanmış ancak bu kaynağa erişim yetkisi yok",
      "İstek başarılı, ancak dönen bir gövde yok",
      "Hız sınırı aşıldı: çok fazla istek gönderildi",
      "Yeni kaynak başarıyla oluşturuldu",
      "İçerik değişmedi, önbellekteki kopya kullanılabilir",
      "Kimlik doğrulaması gerekli ya da geçersiz"
    ]
  },
  {
    no: 32, tur: "eslestirme", zorluk: "çok zor", konu: "Özet (Hash) Algoritmaları",
    soru: "Aşağıdaki özet algoritmalarını ve işlevlerini, doğru kullanım alanı ya da ayırt edici özellikleriyle eşleştiriniz.",
    sol: ["MD5", "SHA-256", "SHA-1", "bcrypt", "scrypt", "HMAC"],
    sag: [
      "Gizli anahtarla imzalı özet üretir (örneğin webhook doğrulama)",
      "Maliyet etmeniyle kasıtlı olarak yavaşlatılan parola özetleme işlevi",
      "2017'de pratik bir çakışma gösterildi; artık güvenli sayılmaz",
      "Dijital imza ve bütünlük doğrulamada güncel standart",
      "Bol bellek tüketimiyle GPU/ASIC saldırılarını pahalılaştıran anahtar türetme işlevi",
      "Kriptografik olarak kırıldı; yalnızca kazara bozulma denetiminde kabul edilebilir"
    ]
  },
  {
    no: 33, tur: "eslestirme", zorluk: "çok zor", konu: "Kimlik Doğrulama",
    soru: "Aşağıdaki kimlik doğrulama yöntem ve standartlarını ayırt edici özellikleriyle eşleştiriniz.",
    sol: ["JWT", "OAuth 2.0", "Temel (Basic) kimlik doğrulama", "Çerez/oturum tabanlı", "OpenID Connect", "SAML"],
    sag: [
      "XML tabanlı kurumsal tek oturum açma standardı",
      "Durum sunucuda tutulur; tarayıcıya yalnızca oturum kimliği yazılır",
      "İmzalı ve kendinden içerikli belirteçle durumsuz doğrulama",
      "OAuth 2.0 üzerine kimlik (kimin oturum açtığı) katmanı ekler",
      "Kullanıcı adı ve parola Base64 ile kodlanıp her istekte gönderilir",
      "Parolayı paylaşmadan üçüncü taraf uygulamaya kapsamı sınırlı yetki devri"
    ]
  },
  {
    no: 34, tur: "eslestirme", zorluk: "çok zor", konu: "API Stilleri",
    soru: "Aşağıdaki API stillerini ve belirtimlerini özellikleriyle eşleştiriniz.",
    sol: ["REST", "GraphQL", "gRPC", "SOAP", "OpenAPI"],
    sag: [
      "XML zarf yapısı ve katı sözleşmeyle (WSDL) çalışan protokol",
      "Bir REST API'sini makine tarafından okunabilir biçimde tanımlayan belirtim",
      "Kaynaklar URL'lerle, işlemler HTTP fiilleriyle ifade edilir",
      "HTTP/2 ve Protocol Buffers üzerinde uzak yordam çağrısı",
      "İstemci tek uç noktadan yalnızca ihtiyaç duyduğu alanları sorgular"
    ]
  },
  {
    no: 35, tur: "eslestirme", zorluk: "çok zor", konu: "Veri Depoları",
    soru: "Aşağıdaki veri depolarını tür ya da ayırt edici nitelikleriyle eşleştiriniz.",
    sol: ["MongoDB", "Neo4j", "InfluxDB", "ClickHouse", "Cassandra", "SQLite", "Memcached"],
    sag: [
      "Sütun yönelimli; büyük hacimli analitik sorgular için eniyilenmiş",
      "Lidersiz mimariyle dağıtık, geniş sütunlu veri deposu",
      "Belge (JSON benzeri) veri modeliyle çalışır",
      "Yalnızca anahtar-değer saklayan bellek içi dağıtık önbellek",
      "Zaman serisi verileri için eniyilenmiş veritabanı",
      "Düğümler ve ilişkilerden oluşan çizge (graph) modeli kullanır",
      "Ayrı sunucu süreci gerektirmeyen, tek dosyada gömülü ilişkisel veritabanı"
    ]
  },
  {
    no: 36, tur: "eslestirme", zorluk: "çok zor", konu: "Mimari ve Dayanıklılık",
    soru: "Aşağıdaki mimari ve dayanıklılık kavramlarını tanımlarıyla eşleştiriniz.",
    sol: ["Zarif bozulma", "Kısıtlama (throttling)", "Devre kesici", "Yük kaydırma (load shifting)", "Hizmet ağı (service mesh)", "Sunucusuz (serverless)"],
    sag: [
      "İstek hızına üst sınır koyarak kaynakları koruma",
      "Servisler arası trafiği yan araç (sidecar) vekillerle yöneten altyapı katmanı",
      "Sunucu yönetiminin sağlayıcıda olduğu, kod çalıştıkça ücretlendirilen model",
      "Bir bileşen çöktüğünde sistemin azaltılmış işlevle çalışmayı sürdürmesi",
      "Hatalı hizmete giden istekleri geçici olarak keserek zincirleme çöküşü önleme",
      "Yoğun saatlerdeki işleri sistemin sakin saatlerine erteleme"
    ]
  },
  {
    no: 37, tur: "eslestirme", zorluk: "çok zor", konu: "Veritabanı Kavramları",
    soru: "Aşağıdaki veritabanı kavramlarını tanımlarıyla eşleştiriniz.",
    sol: ["Normalleştirme", "Parçalama (sharding)", "Çoğaltma (replication)", "Dizin (index)", "Geçiş (migration)", "İşlem (transaction)"],
    sag: [
      "Şema değişikliklerini sürümlenmiş betiklerle denetimli uygulama",
      "Veri tekrarını azaltmak için tabloları kurallı biçimde ayrıştırma",
      "Ya hep ya hiç ilkesiyle çalışan sorgu grubu",
      "Veriyi bir anahtara göre bölerek farklı sunuculara dağıtma",
      "Sorguları hızlandıran yardımcı veri yapısı",
      "Aynı verinin eş kopyalarını farklı düğümlerde tutma"
    ]
  },
  {
    no: 38, tur: "eslestirme", zorluk: "çok zor", konu: "Web Sunucuları ve Vekil Kavramları",
    soru: "Aşağıdaki web sunucularını ve vekil kavramlarını ayırt edici özellikleriyle eşleştiriniz.",
    sol: ["Nginx", "Apache", "Caddy", "MS IIS", "TLS sonlandırma", "Yük dengeleme"],
    sag: [
      "Olay güdümlü mimarisiyle az bellekle çok yüksek eşzamanlılık sağlar",
      "Modül ekosistemi ve .htaccess ile dizin bazlı yapılandırma sunar",
      "Varsayılan olarak otomatik HTTPS sağlayan modern sunucu",
      "Windows Server ile bütünleşik çalışan web sunucusu",
      "Şifreli trafiği vekil üzerinde çözüp arka uca düz HTTP ile iletme",
      "İstekleri birden çok uygulama sürecine ya da sunucuya dağıtma"
    ]
  },
  {
    no: 39, tur: "eslestirme", zorluk: "çok zor", konu: "Web Güvenliği",
    soru: "Aşağıdaki saldırı türlerini en uygun karşı önlemle eşleştiriniz.",
    sol: ["XSS (siteler arası betik çalıştırma)", "CSRF (siteler arası istek sahteciliği)", "SQL enjeksiyonu", "Araya girme (MITM)", "Kaba kuvvet (brute force)", "Oturum çerezi çalınması"],
    sag: [
      "Parametreli sorgular kullanmak",
      "Çerezlere HttpOnly ve Secure öznitelikleri vermek",
      "İçerik Güvenliği Politikası (CSP) ve çıktı kaçışlama uygulamak",
      "TLS/HTTPS ile şifreli ve kimliği doğrulanmış bağlantı kurmak",
      "Hız sınırlama ve hesap kilitleme uygulamak",
      "Çerezlere SameSite özniteliği vermek"
    ]
  },
  {
    no: 40, tur: "eslestirme", zorluk: "çok zor", konu: "Gözlemlenebilirlik",
    soru: "Aşağıdaki gözlemlenebilirlik ve işletim kavramlarını tanımlarıyla eşleştiriniz.",
    sol: ["Enstrümantasyon", "İzleme (monitoring)", "Telemetri", "Profil çıkarma (profiling)", "Günlükleme (logging)"],
    sag: [
      "Olayların zaman damgalı kayıtlarının tutulması",
      "Metriklerin eşik değerlerle sürekli denetlenip uyarı üretilmesi",
      "Uygulama koduna ölçüm noktalarının eklenmesi",
      "Ölçüm verilerinin uzak sistemlerde toplanıp iletilmesi",
      "CPU ve bellek darboğazlarının ayrıntılı çözümlenmesi"
    ]
  },

  // ============ BÖLÜM D — KISA AÇIKLAMA (41–45): 1-2 cümle ============

  {
    no: 41, tur: "acik_kisa", zorluk: "çok çok zor", konu: "On İki Etmenli Uygulamalar",
    soru: "On iki etmenli uygulama (Twelve-Factor App) ilkelerine göre yapılandırma (config) neden kodun içinde değil ortam değişkenlerinde tutulur? Bir ya da iki cümleyle açıklayınız."
  },
  {
    no: 42, tur: "acik_kisa", zorluk: "çok çok zor", konu: "HTTP / REST",
    soru: "HTTP fiillerinden PUT idempotent kabul edilirken POST edilmez. Bu farkın ne anlama geldiğini ve başarısız isteklerin yeniden denenmesi (retry) açısından önemini bir-iki cümleyle açıklayınız."
  },
  {
    no: 43, tur: "acik_kisa", zorluk: "çok çok zor", konu: "Mimari Kalıplar",
    soru: "Hangi koşullarda tekparça (monolith) mimari, mikroservis mimarisine tercih edilmelidir? Bir gerekçe göstererek bir-iki cümleyle açıklayınız."
  },
  {
    no: 44, tur: "acik_kisa", zorluk: "çok çok zor", konu: "Veri Çoğaltma",
    soru: "Eşzamanlı (senkron) ve gecikmeli (asenkron) veri çoğaltma arasındaki temel ödünleşimi (neyi kazanıp neyden vazgeçtiğinizi) bir-iki cümleyle açıklayınız."
  },
  {
    no: 45, tur: "acik_kisa", zorluk: "çok çok zor", konu: "Durumsuzluk ve Ölçekleme",
    soru: "Durumsuz (stateless) API tasarımı yatay ölçeklemeyi neden kolaylaştırır? Bir-iki cümleyle açıklayınız."
  },

  // ========= BÖLÜM E — AÇIKLAMALI (46–50): 1-2 paragraf =========

  {
    no: 46, tur: "acik_uzun", zorluk: "çok çok zor", konu: "Nginx ile Üretim Mimarisi",
    soru: "Bir Node.js web uygulamasının önüne Nginx yerleştirilen tipik üretim mimarisini anlatınız. TLS sonlandırmanın, statik dosya sunumunun ve ters vekilliğin bu mimarideki yerini ve her birinin neden Nginx'e bırakıldığını bir-iki paragrafla açıklayınız."
  },
  {
    no: 47, tur: "acik_uzun", zorluk: "çok çok zor", konu: "Çok Katmanlı Önbellekleme",
    soru: "Yüksek trafikli bir haber API'sinde Redis önbelleğini (cache-aside deseni) ve HTTP önbelleklemesini (Cache-Control, ETag) birlikte nasıl kurgularsınız? Bir haber güncellendiğinde her iki katmanda bayat verinin nasıl geçersiz kılınacağını da ele alarak bir-iki paragrafla açıklayınız."
  },
  {
    no: 48, tur: "acik_uzun", zorluk: "çok çok zor", konu: "Kafka ve RabbitMQ Seçimi",
    soru: "Olay güdümlü bir mimaride Kafka ile RabbitMQ arasında seçim yaparken hangi ölçütlere bakarsınız? İki sistemin ileti saklama ve tüketim modellerindeki temel farkı üzerinden, hangi senaryoda hangisini seçeceğinizi bir-iki paragrafla değerlendiriniz."
  },
  {
    no: 49, tur: "acik_uzun", zorluk: "çok çok zor", konu: "Oturum ve JWT Karşılaştırması",
    soru: "Çerez-oturum tabanlı kimlik doğrulama ile JWT tabanlı kimlik doğrulamayı; yatay ölçekleme, oturumu anında iptal edebilme ve XSS/CSRF riskleri açılarından karşılaştırınız. Hangi senaryoda hangisini tercih edeceğinizi gerekçesiyle bir-iki paragrafla açıklayınız."
  },
  {
    no: 50, tur: "acik_uzun", zorluk: "çok çok zor", konu: "Dağıtık Veritabanı Tasarımı",
    soru: "Dünyanın farklı bölgelerindeki kullanıcılara hizmet veren, okuma ağırlıklı bir uygulamanın veritabanı mimarisini tasarlayınız. CAP teoremi çerçevesinde parçalama (sharding), çoğaltma (replication) ve tutarlılık modeli tercihlerinizi gerekçeleriyle bir-iki paragrafla açıklayınız."
  }
];

// Node.js tarafında (sunucu) da kullanılabilmesi için:
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SORULAR };
}
