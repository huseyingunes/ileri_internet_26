// Örnek içerik. Kampüs ve etkinlik haberleri KURGUSALDIR; sitede "Örnek içerik" etiketiyle görünür.
// Teknoloji ve rehber yazıları genel bilgi niteliğindedir.

export const KATEGORILER = [
  { ad: 'Gündem', slug: 'gundem', renk: '#3446E6', sira: 1 },
  { ad: 'Kampüs', slug: 'kampus', renk: '#0E8A78', sira: 2 },
  { ad: 'Teknoloji', slug: 'teknoloji', renk: '#7A43DB', sira: 3 },
  { ad: 'Ekonomi', slug: 'ekonomi', renk: '#B87400', sira: 4 },
  { ad: 'Spor', slug: 'spor', renk: '#23893F', sira: 5 },
  { ad: 'Kültür-Sanat', slug: 'kultur-sanat', renk: '#BC3485', sira: 6 },
  { ad: 'Balıkesir', slug: 'balikesir', renk: '#0A84A8', sira: 7 },
];

export const YAZARLAR = [
  { ad: 'Elif Aydın', eposta: 'elif.aydin@ornek.haber10da.net' },
  { ad: 'Mert Kaya', eposta: 'mert.kaya@ornek.haber10da.net' },
  { ad: 'Zeynep Demir', eposta: 'zeynep.demir@ornek.haber10da.net' },
];

// saat: kaç saat önce yayımlandı (tohumlama anına göre)
export const HABERLER = [
  {
    kategori: 'gundem',
    yazar: 0,
    saat: 0.4,
    sonDakika: true,
    ornek: false,
    baslik: 'haber10da yayında: gündem artık 10 saniyede',
    spot: 'Balıkesir Üniversitesi Bilgisayar Mühendisliği öğrencilerinin İleri İnternet Programlama dersinde geliştirdiği haber sitesi bugün yayına girdi.',
    ozet: 'İleri İnternet Programlama dersinde öğrencilerin geliştirdiği haber10da yayında. Her haberin 10 saniyede okunacak özeti var; site, backend yol haritasındaki teknolojilerin canlı örneği olarak dönem boyunca büyüyecek.',
    etiketler: ['haber10da', 'ders projesi', 'backend'],
    icerik: `haber10da, Bilgisayar Mühendisliği bölümünde verilen İleri İnternet Programlama dersinin dönem projesi olarak yayına girdi. Sitenin temel fikri basit: her haberin başında, okurun on saniyede okuyabileceği kısa bir özet yer alıyor. Haberin tamamını okumak isteyen okur bir tıkla ayrıntıya geçebiliyor.

Proje aynı zamanda bir öğretim aracı. Sitenin her parçası, backend geliştirici yol haritasındaki bir konuya karşılık geliyor. Haber listeleri Redis ile önbelleğe alınıyor, son dakika gelişmeleri sunucu gönderimli olaylarla anında ekrana düşüyor, editör girişleri JWT ve yenileme belirteçleriyle korunuyor. Özetler ise yapay zekâ modeliyle üretiliyor; model erişilemezse sistem metnin ilk cümlelerinden kendi özetini çıkarıyor.

Öğrenciler dönem boyunca siteye yeni özellikler ekleyecek. Her hafta bir konu işlenecek ve o haftanın konusu sitede çalışan bir özellik olarak karşılık bulacak. Sitenin hangi parçasının hangi teknolojiyle çalıştığını merak eden okurlar "Bu site nasıl çalışıyor?" sayfasından bileşenlerin canlı durumunu izleyebiliyor.`,
  },
  {
    kategori: 'kampus',
    yazar: 1,
    saat: 1.5,
    sonDakika: true,
    baslik: 'Merkez kütüphane final haftasında 24 saat açık kalacak',
    spot: 'Yarıyıl sonu sınavları süresince merkez kütüphanenin çalışma salonları gece de hizmet verecek; gece saatlerinde girişler öğrenci kimliğiyle yapılacak.',
    ozet: 'Merkez kütüphane final haftası boyunca 24 saat açık. Gece girişleri öğrenci kimliğiyle yapılacak, sessiz çalışma salonlarına ek olarak grup çalışma odaları da çevrim içi randevuyla kullanılabilecek.',
    etiketler: ['kütüphane', 'final haftası', 'öğrenci'],
    icerik: `Merkez kütüphane, yarıyıl sonu sınav dönemi boyunca kesintisiz hizmet verecek. Kütüphane yönetiminin açıklamasına göre çalışma salonları gece boyunca açık kalacak, saat 22.00'den sonra binaya girişler yalnızca öğrenci kimlik kartıyla yapılabilecek.

Grup çalışma odaları ise çevrim içi randevu sistemiyle iki saatlik dilimler hâlinde ayrılabilecek. Yoğunluğu azaltmak için her öğrencinin günde en fazla bir randevu alabileceği belirtildi. Kütüphane girişinde bulunan ekranlardan salonların anlık doluluk oranı da takip edilebilecek.

Gece saatlerinde kampüs içi ulaşım için ek ring seferleri planlandığı, ayrıntılı saatlerin öğrenci işleri duyuru sayfasından paylaşılacağı bildirildi. Kütüphane yönetimi, salonlarda yiyecek tüketilmemesi ve masaların uzun süre boş bırakılarak tutulmaması konusunda öğrencilerden anlayış beklediklerini vurguladı.`,
  },
  {
    kategori: 'teknoloji',
    yazar: 2,
    saat: 3,
    ornek: false,
    baslik: 'Tarayıcıda çalışan PostgreSQL: WebAssembly veritabanlarını nereye taşıyor?',
    spot: 'PostgreSQL gibi sunucu veritabanları artık WebAssembly sayesinde tarayıcının ya da Node.js sürecinin içinde, ayrı bir kurulum gerektirmeden çalışabiliyor.',
    ozet: 'WebAssembly ile PostgreSQL artık tarayıcıda veya Node.js içinde kurulum gerektirmeden çalışabiliyor. Bu yaklaşım testleri hızlandırıyor ve çevrim dışı uygulamaları kolaylaştırıyor; ancak üretim sunucusunun yerini tutmuyor.',
    etiketler: ['webassembly', 'postgresql', 'veritabanı'],
    icerik: `WebAssembly, tarayıcıların yalnızca JavaScript değil derlenmiş ikili kodu da güvenli bir kum havuzunda çalıştırmasını sağlayan bir standart. Bu standart sayesinde C ile yazılmış büyük projeler, örneğin PostgreSQL, tarayıcının ya da Node.js sürecinin içinde çalışabilir hâle geldi.

Bu yaklaşımın en görünür faydası geliştirme ve test süreçlerinde ortaya çıkıyor. Bir projeyi bilgisayarına indiren geliştirici, ayrı bir veritabanı sunucusu kurmadan uygulamayı çalıştırabiliyor. Otomatik testler her seferinde bellekte sıfırdan oluşturulan temiz bir veritabanıyla koşabiliyor; bu da testlerin birbirini etkilemesini engelliyor.

Çevrim dışı çalışan uygulamalar da bu gelişmeden yararlanıyor. Veri tarayıcıda gerçek bir SQL veritabanında tutulup bağlantı geldiğinde sunucuyla eşitlenebiliyor.

Ancak uzmanlar, gömülü veritabanlarının yoğun eşzamanlı yazma alan bir üretim sunucusunun yerini tutmadığını hatırlatıyor. Tek süreçte çalıştıkları için yatay ölçeklenme, çoğaltma ve yedekleme gibi ihtiyaçlarda klasik PostgreSQL sunucusu hâlâ doğru tercih. haber10da da geliştirme ortamında gömülü veritabanı, yayında ise PostgreSQL sunucusu kullanıyor.`,
  },
  {
    kategori: 'kampus',
    yazar: 0,
    saat: 5,
    baslik: 'Yapay zekâ kulübü ilk hackathonunu kampüste düzenliyor',
    spot: 'Mühendislik Fakültesi Yapay Zekâ Kulübü, 36 saat sürecek hackathonda öğrencilerden kampüs yaşamını kolaylaştıracak projeler bekliyor.',
    ozet: 'Yapay Zekâ Kulübü 36 saatlik ilk hackathonunu düzenliyor. En fazla dört kişilik takımlar kampüs yaşamını kolaylaştıran projeler geliştirecek; başvurular kulübün sayfasından alınıyor.',
    etiketler: ['hackathon', 'yapay zekâ', 'öğrenci kulübü'],
    icerik: `Mühendislik Fakültesi Yapay Zekâ Kulübü, ilk hackathonunu önümüzdeki ay fakülte binasında düzenleyecek. 36 saat sürecek etkinlikte öğrenciler en fazla dört kişilik takımlar hâlinde yarışacak.

Hackathonun teması "kampüs yaşamı" olarak belirlendi. Takımlardan ulaşım, yemekhane, kütüphane, ders kayıt ve etkinlik takibi gibi alanlarda öğrencilerin günlük işlerini kolaylaştıracak çalışan bir prototip geliştirmeleri bekleniyor. Projeler; fikrin özgünlüğü, teknik uygulama, kullanıcı deneyimi ve sunum ölçütlerine göre değerlendirilecek.

Kulüp yönetimi, yapay zekâ araçlarının kullanımının serbest olduğunu ancak jürinin takımlardan kodlarını ve tasarım kararlarını açıklamalarını isteyeceğini belirtti. Etkinlik süresince deneyimli mentorlar takımlara destek verecek.

Başvurular kulübün sayfasından alınıyor. Takımı olmayan öğrenciler de başvurabilecek; etkinliğin ilk saatinde takım eşleştirme oturumu yapılacak.`,
  },
  {
    kategori: 'teknoloji',
    yazar: 1,
    saat: 8,
    ornek: false,
    baslik: 'Redis neden bu kadar hızlı? Bellek içi veri deposunun kısa tarihi',
    spot: 'Önbellekten oturum yönetimine, sıralama tablolarından mesajlaşmaya kadar pek çok işte kullanılan Redis, hızını verileri bellekte tutmasına ve basit tasarımına borçlu.',
    ozet: 'Redis verileri diskte değil bellekte tuttuğu ve komutları tek iş parçacığında sırayla işlediği için çok hızlıdır. Önbellek, sıralama tablosu, hız sınırlama ve yayın-abone mesajlaşması için yaygın kullanılır.',
    etiketler: ['redis', 'önbellek', 'veritabanı'],
    icerik: `Redis, verileri sabit disk yerine doğrudan ana bellekte tutan bir anahtar-değer deposu. Bellek erişimi diske göre kat kat hızlı olduğu için Redis'e yapılan okuma ve yazmalar genellikle milisaniyenin altında tamamlanıyor.

Redis'in bir diğer özelliği komutları tek bir iş parçacığında sırayla işlemesi. İlk bakışta bir kısıt gibi görünen bu tasarım, kilit mekanizmalarına ihtiyaç duymadan her komutun atomik çalışmasını sağlıyor. Bir sayacı artırmak ya da bir listeye eleman eklemek gibi işlemler eşzamanlı isteklerde bile tutarlı sonuç veriyor.

Redis yalnızca metin saklamıyor. Listeler, kümeler, sıralı kümeler ve karma tablolar gibi veri yapıları sunuyor. Bu sayede "en çok okunan haberler" gibi bir sıralama tek komutla güncellenebiliyor, hız sınırlama için istek sayaçları süreli olarak tutulabiliyor.

Verilerin bellekte durması kalıcılık sorusunu da beraberinde getiriyor. Redis, belirli aralıklarla anlık görüntü alarak ya da her yazmayı bir günlüğe ekleyerek verileri diske de yazabiliyor. Yine de çoğu sistemde Redis birincil veritabanının yerine değil, önünde çalışan hızlı bir katman olarak konumlanıyor.`,
  },
  {
    kategori: 'spor',
    yazar: 2,
    saat: 11,
    baslik: 'Üniversite e-spor takımı için seçmeler başladı',
    spot: 'Üniversiteler arası e-spor liginde mücadele edecek takım için seçmeler iki hafta sürecek; adaylar hem bireysel performans hem takım uyumu açısından değerlendirilecek.',
    ozet: 'Üniversiteler arası e-spor ligine katılacak takımın seçmeleri başladı. İki hafta sürecek elemelerde adaylar bireysel performans ve takım uyumuna göre değerlendirilecek; başvurular spor kulübünden.',
    etiketler: ['e-spor', 'seçmeler', 'öğrenci'],
    icerik: `Üniversite Spor Kulübü'ne bağlı e-spor birimi, bu sezon üniversiteler arası ligde yarışacak takım için seçmelere başladı. İki hafta sürecek seçmelerde adaylar önce bireysel oyunlarda, ardından karma takımlar içinde değerlendirilecek.

Birim sorumluları, seçmelerde yalnızca oyun becerisine değil iletişim, strateji kurma ve baskı altında karar verme yeteneğine de bakılacağını belirtti. Takıma seçilen öğrencilerin haftada üç akşam düzenli antrenmanlara katılması bekleniyor.

Antrenmanlar kulübün yeni donatılan oyun odasında yapılacak. Odadaki bilgisayarlar turnuva standartlarına uygun ekran ve çevre birimleriyle donatıldı. Ders programıyla çakışmaması için antrenman saatlerinin dönem başında öğrencilerle birlikte belirleneceği açıklandı.

Başvurular spor kulübünün ofisinden ve çevrim içi formdan alınıyor. Önceki deneyimi olmayan ancak gelişime açık öğrencilerin de başvurması teşvik ediliyor.`,
  },
  {
    kategori: 'ekonomi',
    yazar: 0,
    saat: 14,
    ornek: false,
    baslik: 'Öğrenci bütçesi: ay sonunu getirmek için beş pratik yöntem',
    spot: 'Harçlık, burs ya da yarı zamanlı iş gelirini planlamak için karmaşık tablolara gerek yok; birkaç basit alışkanlık ay sonunu rahatlatabiliyor.',
    ozet: 'Ay sonunu getirmek için geliri ilk gün bölüştürmek, sabit giderleri önden ayırmak, küçük harcamaları bir hafta yazmak, aboneliklerden tasarruf etmek ve küçük bir acil durum payı bırakmak yeterli.',
    etiketler: ['bütçe', 'öğrenci', 'tasarruf'],
    icerik: `Öğrencilerin büyük kısmı için ay sonu, bütçenin en zorlandığı dönem. Uzmanlar bunun için karmaşık hesap tablolarına gerek olmadığını, birkaç basit alışkanlığın fark yarattığını söylüyor.

İlk yöntem, gelirin hesaba geçtiği gün bölüştürülmesi. Kira, yurt, ulaşım ve telefon gibi sabit giderler önce ayrılıyor; kalan tutar haftalara bölünerek her haftanın harcama sınırı belirleniyor.

İkinci adım küçük harcamaları görünür kılmak. Bir hafta boyunca yapılan her harcamanın not edilmesi, çoğu zaman fark edilmeyen kahve, atıştırmalık ve paket servis giderlerini ortaya çıkarıyor.

Üçüncü olarak dijital aboneliklerin gözden geçirilmesi öneriliyor. Kullanılmayan uygulama ve platform abonelikleri iptal edilebilir, bazıları arkadaşlarla paylaşılabilir ya da öğrenci indiriminden yararlanılabilir.

Dördüncü yöntem toplu ve planlı alışveriş. Haftalık yemek planı yapıp alışverişi buna göre yapmak hem israfı hem harcamayı azaltıyor.

Son olarak, gelir ne kadar küçük olursa olsun beklenmedik durumlar için küçük bir pay bırakmak, ay sonundaki sıkışıklığı önemli ölçüde hafifletiyor.`,
  },
  {
    kategori: 'kultur-sanat',
    yazar: 1,
    saat: 18,
    baslik: "Fakülte fuayesinde 'Algoritmik Sanat' sergisi açıldı",
    spot: 'Bilgisayar Mühendisliği öğrencilerinin kodla ürettiği görsellerden oluşan sergi, iki hafta boyunca Mühendislik Fakültesi fuayesinde ziyaret edilebilecek.',
    ozet: 'Öğrencilerin kodla ürettiği eserlerden oluşan Algoritmik Sanat sergisi Mühendislik Fakültesi fuayesinde açıldı. Her eserin yanındaki karekod, onu üreten koda ve rastgelelik tohumuna yönlendiriyor.',
    etiketler: ['sergi', 'algoritmik sanat', 'kodlama'],
    icerik: `Mühendislik Fakültesi fuayesi iki hafta boyunca alışılmadık bir sergiye ev sahipliği yapacak. Bilgisayar Mühendisliği öğrencilerinin hazırladığı "Algoritmik Sanat" sergisinde, fırça yerine kodla üretilmiş yirmi dört eser yer alıyor.

Eserlerin bir kısmı akış alanları ve parçacık sistemleriyle, bir kısmı ise yinelemeli geometrik desenlerle üretildi. Her eserin yanında bulunan karekod, ziyaretçiyi eseri üreten kaynak koda ve kullanılan rastgelelik tohumuna yönlendiriyor. Aynı tohumla kodu çalıştıran herkes, sergideki görüntünün tıpatıp aynısını kendi bilgisayarında elde edebiliyor.

Serginin hazırlık sürecinde öğrenciler, rastgeleliğin sanatta nasıl denetlenebileceği üzerine çalıştı. Katılımcılardan biri, tohum değerini değiştirmenin aynı fikrin sonsuz farklı yorumunu üretmek gibi olduğunu söyledi.

Sergi hafta içi her gün fakülte açık olduğu saatlerde ücretsiz ziyaret edilebiliyor. Kapanış gününde eserlerin nasıl üretildiğinin anlatılacağı kısa bir atölye de planlanıyor.`,
  },
  {
    kategori: 'teknoloji',
    yazar: 2,
    saat: 22,
    ornek: false,
    baslik: 'Parolasız giriş yaygınlaşıyor: geçiş anahtarları nasıl çalışır?',
    spot: 'Geçiş anahtarları (passkey), parolaların yerini açık anahtarlı şifrelemeye bırakıyor; kimlik avı saldırılarına karşı da daha dayanıklı.',
    ozet: 'Geçiş anahtarları parolanın yerine cihazda saklanan özel anahtar ve sunucudaki açık anahtarla çalışır. Sunucuya gizli bilgi gitmediği ve anahtar yalnızca doğru siteye bağlı olduğu için kimlik avına dayanıklıdır.',
    etiketler: ['güvenlik', 'passkey', 'kimlik doğrulama'],
    icerik: `Parolalar uzun süredir hem kullanıcılar hem de sistemler için bir güvenlik sorunu. Tekrar kullanılan, tahmin edilebilen ya da sahte sitelere kaptırılan parolalar hesap ele geçirmelerinin başlıca nedenleri arasında. Geçiş anahtarları bu soruna farklı bir yaklaşım getiriyor.

Bir sitede geçiş anahtarı oluşturulduğunda cihaz bir anahtar çifti üretiyor. Özel anahtar cihazda, güvenli donanım alanında kalıyor; sunucuya yalnızca açık anahtar gönderiliyor. Giriş sırasında sunucu rastgele bir meydan okuma gönderiyor, cihaz bunu özel anahtarla imzalıyor ve sunucu imzayı açık anahtarla doğruluyor.

Bu yöntemde sunucuda çalınabilecek bir parola bulunmuyor. Ayrıca anahtar, oluşturulduğu alan adına bağlı. Saldırgan birebir kopya bir site hazırlasa bile tarayıcı o siteye ait olmayan anahtarı kullanmıyor; bu da kimlik avı saldırılarını büyük ölçüde etkisiz kılıyor.

Kullanıcı açısından giriş, parmak izi, yüz tanıma ya da cihaz kilidi kadar kolaylaşıyor. Geliştiriciler için ise WebAuthn standardı, geçiş anahtarı desteğini web uygulamalarına eklemenin yolunu sunuyor.`,
  },
  {
    kategori: 'balikesir',
    yazar: 0,
    saat: 26,
    ornek: false,
    baslik: "Kaz Dağları'nda sonbahar yürüyüşü: yola çıkmadan önce bilmeniz gerekenler",
    spot: 'Sonbaharda renk cümbüşüne dönen Kaz Dağları yürüyüşçülerin gözdesi; ancak kısalan günler ve değişken hava iyi bir hazırlık gerektiriyor.',
    ozet: "Kaz Dağları'nda sonbahar yürüyüşü için rotayı önceden paylaşın, gün ışığına göre plan yapın, katmanlı giyinin, yeterli su taşıyın ve işaretli patikalardan ayrılmayın; hava hızla değişebilir.",
    etiketler: ['kaz dağları', 'doğa yürüyüşü', 'sonbahar'],
    icerik: `Kaz Dağları, sonbaharda yaprakların sarı ve kızıla döndüğü manzarasıyla yürüyüşçüler için ayrı bir çekiciliğe sahip. Ancak bu mevsimde dağda geçirilecek günün keyifli geçmesi iyi bir hazırlığa bağlı.

İlk kural, rotayı ve dönüş saatini yola çıkmadan önce bir yakınla paylaşmak. Dağın bazı bölümlerinde telefon çekmeyebileceği için bu basit adım olası bir aksilikte zaman kazandırıyor.

Sonbaharda günler kısalıyor. Yürüyüşün gün batımından en az bir saat önce bitecek şekilde planlanması, yanınızda bir el feneri bulundurulması öneriliyor.

Hava dağda vadiye göre çok daha hızlı değişebiliyor. Katmanlı giyinmek, rüzgârlık ve yağmurluk taşımak, kaymayan tabanlı ayakkabı tercih etmek gerekiyor. Yeterli su ve enerji verici yiyecek de çantada mutlaka yer almalı.

İşaretli patikalardan ayrılmamak hem güvenlik hem de doğanın korunması açısından önemli. Milli park alanlarında ateş yakmanın yasak olduğunu ve çöplerin geri getirilmesi gerektiğini de unutmamak gerekiyor.`,
  },
  {
    kategori: 'kampus',
    yazar: 2,
    saat: 30,
    baslik: 'Öğrencilerden kampüs otoparkları için anlık doluluk uygulaması',
    spot: 'Bilgisayar Mühendisliği öğrencilerinin dönem projesi olarak geliştirdiği uygulama, otopark girişlerindeki kameralardan doluluk oranını hesaplıyor.',
    ozet: 'Bilgisayar Mühendisliği öğrencileri, kamera görüntülerinden kampüs otoparklarının doluluğunu hesaplayan bir uygulama geliştirdi. Görüntüler cihazda işleniyor, sunucuya yalnızca araç sayısı gönderiliyor.',
    etiketler: ['görüntü işleme', 'kampüs', 'öğrenci projesi'],
    icerik: `Sabah derslerine yetişmeye çalışan öğrenci ve personelin en büyük sorunlarından biri boş park yeri bulmak. Bilgisayar Mühendisliği öğrencileri bu soruna dönem projesiyle çözüm aradı.

Geliştirilen sistem, otopark girişlerine yerleştirilen kameralardan alınan görüntüleri nesne tanıma modeliyle işliyor. Giren ve çıkan araçlar sayılarak her otoparkın anlık doluluk oranı hesaplanıyor ve bir web sayfasında harita üzerinde gösteriliyor.

Proje ekibi, kişisel verilerin korunmasına özellikle dikkat ettiklerini belirtti. Görüntüler kameranın bağlı olduğu küçük bilgisayarda işleniyor; sunucuya yalnızca araç sayısı gönderiliyor, plaka ya da görüntü kaydı tutulmuyor.

Sistemin şimdilik deneme aşamasında olduğu, farklı ışık ve hava koşullarında doğruluğun artırılması için çalışmaların sürdüğü açıklandı. Ekip, gelecek dönemde uygulamaya ders programıyla bağlantılı tahmin özelliği eklemeyi planlıyor.`,
  },
  {
    kategori: 'gundem',
    yazar: 1,
    saat: 34,
    ornek: false,
    baslik: 'Kimlik avı e-postalarına karşı beş dakikalık kontrol listesi',
    spot: 'Sınav dönemlerinde "not bildirimi" ya da "burs ödemesi" görünümlü sahte e-postalar artıyor; birkaç basit kontrol hesabınızı korumaya yetiyor.',
    ozet: 'Sahte e-postalara karşı gönderen adresini ve bağlantının gerçek adresini kontrol edin, aciliyet baskısına kapılmayın, parolanızı yalnızca adres çubuğuna kendiniz yazdığınız sitede girin ve iki aşamalı doğrulamayı açın.',
    etiketler: ['siber güvenlik', 'kimlik avı', 'e-posta'],
    icerik: `Kimlik avı (phishing) saldırıları, kullanıcıyı sahte bir sayfaya yönlendirerek parola ya da kart bilgisi ele geçirmeyi amaçlıyor. Bu tür e-postalar özellikle sınav ve burs dönemlerinde "not bildirimi", "hesabınız askıya alındı" ya da "ödemeniz bekliyor" gibi başlıklarla geliyor.

İlk kontrol gönderen adresi. Görünen ad kurum adı olsa bile adresin alan adı farklı olabiliyor. İkinci kontrol bağlantının kendisi: bağlantının üzerine gelindiğinde görünen gerçek adres, kurumun alan adıyla birebir eşleşmeli.

Üçüncü işaret aciliyet baskısı. "24 saat içinde işlem yapmazsanız hesabınız kapanacak" gibi ifadeler düşünmeden tıklatmak için kullanılıyor. Kurumlar genellikle bu tür taleplerde bulunmuyor.

Dördüncü kural, parolanın yalnızca adres çubuğuna kendi yazdığınız sitede girilmesi. E-postadaki bağlantıya tıklamak yerine siteye doğrudan gitmek en güvenli yol.

Son olarak iki aşamalı doğrulamayı açmak, parola ele geçirilse bile hesabın korunmasına yardımcı oluyor. Şüpheli bir e-posta alındığında bilgi işlem birimine bildirilmesi de diğer kullanıcıları koruyor.`,
  },
  {
    kategori: 'spor',
    yazar: 0,
    saat: 40,
    baslik: 'Kampüs koşusu bu yıl iki parkurla yapılacak',
    spot: 'Geleneksel kampüs koşusunda bu yıl 5 ve 10 kilometrelik iki parkur olacak; katılımcılar çip ile zaman ölçümü yapılan sonuçlarını çevrim içi görebilecek.',
    ozet: 'Kampüs koşusu bu yıl 5 ve 10 kilometrelik iki parkurla düzenlenecek. Zamanlar çiple ölçülecek, sonuçlar çevrim içi yayımlanacak; kayıtlar spor kulübünden yapılıyor.',
    etiketler: ['koşu', 'kampüs', 'etkinlik'],
    icerik: `Her bahar düzenlenen kampüs koşusu bu yıl yeni bir formatla yapılacak. Düzenleme kurulu, farklı seviyelerdeki koşuculara hitap etmek için 5 ve 10 kilometrelik iki ayrı parkur hazırlandığını açıkladı.

5 kilometrelik parkur kampüs içindeki ana yollardan oluşuyor ve yürüyüş temposundaki katılımcılara da uygun. 10 kilometrelik parkur ise yerleşkenin çevresindeki eğimli bölümleri de kapsıyor.

Bu yıl ilk kez çip ile zaman ölçümü yapılacak. Göğüs numarasına yerleştirilen çip, başlangıç ve bitiş çizgisindeki okuyucular sayesinde her koşucunun süresini otomatik kaydedecek. Sonuçlar koşu bitiminden kısa süre sonra çevrim içi yayımlanacak.

Parkur boyunca su istasyonları ve sağlık ekipleri bulunacak. Koşuya katılacakların sağlık durumlarının uygun olduğunu beyan etmeleri gerekiyor. Kayıtlar spor kulübünden ve çevrim içi formdan alınıyor.`,
  },
  {
    kategori: 'teknoloji',
    yazar: 1,
    saat: 46,
    ornek: false,
    baslik: 'Yapay zekâ kod asistanları yazılım ekiplerinin çalışma biçimini değiştiriyor',
    spot: 'Kod tamamlama ile başlayan yapay zekâ araçları artık dosyalar arasında değişiklik yapan, test çalıştıran ajanlara dönüştü; ekipler kod incelemesine daha çok zaman ayırıyor.',
    ozet: 'Yapay zekâ kod araçları tamamlama aracından testleri çalıştırıp çok dosyalı değişiklik yapan ajanlara dönüştü. Ekipler yazmaya daha az, gözden geçirmeye ve doğrulamaya daha çok zaman ayırıyor.',
    etiketler: ['yapay zekâ', 'yazılım geliştirme', 'kod asistanı'],
    icerik: `Birkaç yıl önce yalnızca satır tamamlayan yapay zekâ araçları, bugün bir görevi baştan sona üstlenebilen ajanlara dönüştü. Bu araçlar bir hata kaydını okuyup ilgili dosyaları bulabiliyor, değişikliği yapıp testleri çalıştırabiliyor ve sonucu geliştiriciye özetleyebiliyor.

Bu değişim yazılım ekiplerinin iş bölümünü de etkiliyor. Kodu satır satır yazmaya ayrılan zaman azalırken, isteği doğru tarif etmeye, üretilen değişikliği incelemeye ve doğrulamaya ayrılan zaman artıyor. Kod incelemesi, ekiplerin en kritik becerisi hâline geliyor.

Uzmanlar, bu araçların verimli kullanımının iyi mühendislik alışkanlıklarına bağlı olduğunu vurguluyor. Kapsamlı otomatik testler, açık kodlama kuralları ve iyi belgelenmiş projeler, yapay zekânın ürettiği değişikliğin güvenle kabul edilebilmesini sağlıyor.

Eğitim tarafında da yeni sorular gündemde. Öğrencilerin temel kavramları araç olmadan öğrenmesi ile gerçek projelerde bu araçları etkin kullanmayı öğrenmesi arasındaki dengenin nasıl kurulacağı tartışılıyor. Pek çok ders, değerlendirmede öğrencinin ürettiği kodu açıklayabilmesine ağırlık vermeye başladı.`,
  },
  {
    kategori: 'kultur-sanat',
    yazar: 2,
    saat: 52,
    baslik: 'Sinema kulübünden bir hafta sürecek bilim kurgu seçkisi',
    spot: 'Sinema kulübü, yapay zekâ ve uzay temalı filmlerden oluşan seçkisini her akşam gösterim sonrası söyleşilerle sunacak.',
    ozet: 'Sinema kulübü bir hafta boyunca yapay zekâ ve uzay temalı bilim kurgu filmleri gösterecek. Her gösterimin ardından film üzerine söyleşi yapılacak; girişler ücretsiz.',
    etiketler: ['sinema', 'bilim kurgu', 'öğrenci kulübü'],
    icerik: `Üniversite Sinema Kulübü, bir hafta sürecek bilim kurgu seçkisinin programını açıkladı. Seçki, yapay zekâ, uzay keşfi ve teknolojinin insan ilişkilerine etkisi temalarında farklı dönemlerden filmleri bir araya getiriyor.

Gösterimler her akşam kültür merkezinin küçük salonunda yapılacak. Her filmin ardından kulüp üyeleri ve davetli akademisyenlerle film üzerine söyleşi düzenlenecek. Söyleşilerde filmlerde öngörülen teknolojilerle bugünkü gerçeklik arasındaki benzerlik ve farklar tartışılacak.

Kulüp yönetimi, seçkiyi hazırlarken bilim kurguyu yalnızca görsel efektlerle değil, sorduğu sorularla öne çıkan filmlerden oluşturmaya özen gösterdiklerini belirtti.

Gösterimlere giriş ücretsiz. Salon kapasitesi sınırlı olduğu için yerlerin gösterimden yarım saat önce dolabileceği hatırlatıldı.`,
  },
  {
    kategori: 'balikesir',
    yazar: 1,
    saat: 60,
    ornek: false,
    baslik: "Höşmerim: Balıkesir'in sofralarından vitrinlere uzanan tatlı",
    spot: 'Taze peynir, irmik ve unla yapılan höşmerim, Balıkesir mutfağının en bilinen tatlılarından; bayramlardan misafir sofralarına kadar yerini koruyor.',
    ozet: "Höşmerim taze tuzsuz peynir, irmik ve un ile yapılan, şerbetle tatlandırılan bir Balıkesir tatlısı. Evlerde bayram ve misafir sofralarının vazgeçilmezi; bugün kentin tatlıcılarında da sunuluyor.",
    etiketler: ['höşmerim', 'balıkesir mutfağı', 'yöresel lezzet'],
    icerik: `Balıkesir denince akla gelen lezzetlerin başında höşmerim geliyor. Temel malzemesi taze ve tuzsuz peynir olan tatlı, irmik ve unla birlikte kısık ateşte uzun süre karıştırılarak pişiriliyor, ardından şerbetle tatlandırılıyor.

Tatlının en önemli sırrı sabır. Peynirin suyunu salıp irmikle bütünleşmesi, karışımın yağını bırakarak altın rengini alması zaman istiyor. Usta eller, kıvamı kaşığın karışımdan bıraktığı izden anlıyor.

Höşmerim uzun yıllar boyunca evlerde, özellikle bayramlarda ve misafir sofralarında hazırlanan bir tatlı olarak bilindi. Bugün kentin tatlıcılarında da sunuluyor ve kenti ziyaret edenlerin tatmadan dönmediği lezzetler arasında sayılıyor.

Yöresel tariflerde küçük farklılıklar görülüyor. Kimi aileler cevizle, kimileri sade sunuyor; şerbetin yoğunluğu da evden eve değişiyor. Ortak nokta ise taze peynir kullanımı ve kısık ateşte uzun pişirme.`,
  },
  {
    kategori: 'ekonomi',
    yazar: 2,
    saat: 68,
    ornek: false,
    baslik: 'Yazılım sektöründe uzaktan ve karma çalışma kalıcı hâle geliyor',
    spot: 'Pek çok yazılım şirketi haftanın bazı günleri ofiste buluşulan karma modele geçti; yeni mezunlar için ise mentorluk ve ekip içi öğrenme öne çıkıyor.',
    ozet: 'Yazılım şirketlerinin çoğu tam uzaktan çalışma yerine haftanın bazı günleri ofiste buluşulan karma modeli benimsiyor. Yeni mezunlar için mentorluk ve yazılı iletişim becerisi önem kazanıyor.',
    etiketler: ['uzaktan çalışma', 'yazılım sektörü', 'kariyer'],
    icerik: `Yazılım sektörü, uzaktan çalışmayı en hızlı benimseyen sektörlerin başında geliyor. Son yıllarda ise birçok şirket tam uzaktan çalışma yerine, ekiplerin haftanın belirli günlerinde ofiste buluştuğu karma modele yöneldi.

Karma modelin savunucuları, ofiste geçirilen günlerin tasarım oturumları, planlama toplantıları ve yeni çalışanların ekibe uyumu için verimli olduğunu belirtiyor. Odaklanma gerektiren kodlama işleri ise evde daha rahat yapılabiliyor.

Bu düzen yeni mezunlar için hem fırsat hem de sınama anlamına geliyor. Farklı şehirlerdeki şirketlere başvurabilmek fırsatların sayısını artırırken, deneyimli meslektaşları yanı başında görememek öğrenmeyi zorlaştırabiliyor. Bu nedenle şirketler yapılandırılmış mentorluk programlarına ağırlık veriyor.

İnsan kaynakları uzmanları, dağıtık ekiplerde yazılı iletişimin öne çıktığını vurguluyor. Açık bir hata kaydı, anlaşılır bir çekme isteği açıklaması ya da iyi yazılmış bir tasarım belgesi, adayları öne çıkaran beceriler arasında sayılıyor.`,
  },
];
