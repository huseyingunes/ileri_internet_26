# İleri İnternet Programlama — 2. Sınav Sistemi

Öğrencilerin numaralarıyla giriş yapıp tarayıcıdan çözdüğü, cevapların anlık olarak
SQLite veritabanına kaydedildiği 50 soruluk çevrimiçi sınav sistemi.

## Gereksinimler

- Node.js **22.13 ya da üzeri** (SQLite için Node'un yerleşik `node:sqlite` modülü
  kullanılır; **hiçbir paket kurulumu gerekmez**, `npm install` yoktur).

## Sunucuyu Çalıştırma

```
cd C:\GitHub\ileri_internet_26\2_sinav
node sunucu.js
```

Açılışta şu iki satırı görmelisiniz:

```
Öğrenci listesi yüklendi: 64 kayıt.
Sınav sunucusu dinliyor: http://localhost:9875
```

- Sunucu **9875** numaralı kapıda, tüm ağ arabirimlerinde dinler.
- Öğrenciler aynı ağdan `http://SUNUCU_IP:9875` adresine girer
  (sunucu bilgisayarın IP adresini `ipconfig` ile öğrenebilirsiniz).
- Windows güvenlik duvarı ilk çalıştırmada izin isterse "İzin ver" deyiniz.
- Sunucuyu kapatmak için `Ctrl+C`.
- `sinav.db` veritabanı dosyası ilk açılışta kendiliğinden oluşur.

## Öğrenci Listesi

- Liste `ogrenciler.csv` dosyasındadır; her satır `numara;ad soyad` biçimindedir.
- Sunucu **her açılışta** bu dosyayı okuyup veritabanına işler: yeni numara eklenir,
  var olan numaranın adı güncellenir. Listeyi değiştirirseniz sunucuyu yeniden başlatın.
- Listede olmayan bir numarayla sınava girilemez.

## Öğrenci Açısından Sınav Akışı

1. Öğrenci `http://SUNUCU_IP:9875` adresini açar, **yalnızca öğrenci numarasını**
   yazar ve "Sınava Giriş" düğmesine basar. Parola yoktur; ad soyad listeden gelir.
2. Sınav tek sayfadır: 5 bölüm, 50 soru.
   - **Bölüm A (1–15):** Çoktan seçmeli
   - **Bölüm B (16–30):** Kısa cevap (1-2 kelime)
   - **Bölüm C (31–40):** Eşleştirme
   - **Bölüm D (41–45):** Kısa açıklama (1-2 cümle)
   - **Bölüm E (46–50):** Açıklamalı (1-2 paragraf)
3. **Soru sırası her öğrencide ve her girişte farklıdır** (bölüm sırası sabittir,
   bölüm içindeki sorular karıştırılır).
4. **Her işaretleme anında sunucuya kaydedilir.** Alt çubukta "✓ Kaydedildi"
   göstergesi vardır. Bağlantı koparsa cevaplar tarayıcıda bekletilir, "Bağlantı
   yok" uyarısı görünür ve bağlantı dönünce kendiliğinden gönderilir.
5. Sayfa kapansa, tarayıcı çökse ya da internet gitse bile öğrenci numarasıyla
   yeniden giriş yaptığında **kaldığı yerden devam eder**; kayıtlı cevapları
   dolu olarak gelir.
6. Öğrenci "**Sınavı Bitir**" düğmesine basıp onayladığında cevaplar kilitlenir;
   artık değiştirilemez.

## Sonuçlar

- Bitirme anında **1–40. sorular sunucuda kendiliğinden puanlanır** ve öğrenci
  sonucunu hemen görür: 80 üzerinden puanı ile soru bazında
  Doğru / Yanlış / Kısmen doğru / Boş dökümü.
- Puanlama: her soru 2 puan (toplam 100). Eşleştirmede her doğru çift oransal
  puan alır. Kısa cevaplarda büyük/küçük harf, noktalama ve Türkçe karakter
  farkları hoş görülür (ör. "Html", "ters vekil / reverse proxy" kabul edilir).
- **41–50. açık uçlu sorular (20 puan)** puanlanmaz; "Değerlendirilecek" olarak
  işaretlenir ve cevap metinleri veritabanında saklanır. Bunları öğretim elemanı
  değerlendirir.
- Sınavı bitiren öğrenci sonradan numarasıyla tekrar girerse doğrudan sonuç
  ekranını görür; sınava yeniden giremez.

## Dosyalar

| Dosya | Görevi |
|---|---|
| `sunucu.js` | Web sunucusu ve API uç noktaları (giriş, kaydet, bitir) |
| `veritabani.js` | SQLite şeması, sorgular, CSV'den öğrenci yükleme |
| `degerlendirme.js` | Özdevimli puanlama (A, B, C bölümleri) |
| `sorular.js` | 50 sorunun verisi (tarayıcıya da sunulur) |
| `cevap_anahtari.js` | Cevap anahtarı — **yalnızca sunucu okur, tarayıcıya verilmez** |
| `ogrenciler.csv` | Öğrenci listesi — tarayıcıya verilmez |
| `index.html`, `stil.css`, `sinav.js` | Öğrencinin gördüğü sayfa |
| `sinav.db` | SQLite veritabanı (çalışma anında oluşur) |
| `BENIOKU.md` | Bu dosya |

`cevap_anahtari.js`, `ogrenciler.csv`, `sinav.db` ve sunucu dosyaları tarayıcıdan
istenirse sunucu **404** döndürür; öğrenciler bu dosyalara erişemez.

## Veritabanı

`sinav.db` içinde üç tablo vardır:

- **ogrenciler** — numara, ad, oturum belirteci, durum
  (`baslamadi` / `devam` / `tamamlandi`), giriş ve bitiş zamanları
- **cevaplar** — öğrenci numarası + soru numarası başına son cevap ve
  güncellenme zamanı
- **sonuclar** — özdevimli puan ve soru bazında sonuç dökümü (JSON)

İncelemek isterseniz (örneğin bitirenleri listelemek):

```
node -e "const {DatabaseSync}=require('node:sqlite'); const vt=new DatabaseSync('sinav.db'); console.table(vt.prepare('SELECT numara, durum, bitis_zamani FROM ogrenciler WHERE durum=\'tamamlandi\'').all())"
```

## Sınav Öncesi Denetim Listesi

1. `ogrenciler.csv` güncel mi?
2. `node sunucu.js` ile sunucu açıldı mı, 64 kayıt yüklendi mi?
3. Başka bir bilgisayardan `http://SUNUCU_IP:9875` açılıyor mu?
4. Deneme girişi yapıp bir-iki cevap işaretlediniz mi? ("✓ Kaydedildi" görünmeli)
5. Denemeyi temizlemek için: sunucuyu kapatın, `sinav.db` (ve varsa
   `sinav.db-wal`, `sinav.db-shm`) dosyalarını silin, yeniden başlatın.
   **Gerçek sınav başladıktan sonra bu dosyaları silmeyiniz; tüm cevaplar oradadır.**
