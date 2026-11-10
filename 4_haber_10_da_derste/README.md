# haber10da — Firebase ile giriş

Giriş yolları: **Google**, **GitHub**, **e-posta + parola** (doğrulama ve parola sıfırlama e-postalarını Firebase gönderir).
Roller: `okuyucu` (varsayılan), `editor`, `yonetici`. Rol, Firebase kullanıcısının özel niteliğinde (`rol`) tutulur.

## 1. Firebase Console

1. <https://console.firebase.google.com> → **Proje ekle** → ad: `haber10da` (Analytics kapalı olabilir).
2. **Proje ayarları → Uygulamalarınız → Web (`</>`)** → uygulamayı kaydedin, çıkan değerleri `public/js/firebase-ayar.js` dosyasına yazın.
3. **Authentication → Başlayın → Oturum açma yöntemi**
   - **E-posta/Şifre** → Etkinleştir.
   - **Google** → Etkinleştir, destek e-postasını seçin.
   - **GitHub** → Etkinleştir. Ekranda görünen yönlendirme adresini kopyalayın
     (`https://PROJE-KIMLIGI.firebaseapp.com/__/auth/handler`), 4. adımda kullanacaksınız.
4. **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
   - Homepage URL: `https://haber10da.net`
   - Authorization callback URL: 3. adımda kopyaladığınız adres
   - Oluşan **Client ID** ve **Client Secret** değerlerini Firebase'deki GitHub ekranına yapıştırın.
   - Yönlendirme adresi Firebase'e ait olduğu için tek GitHub uygulaması hem geliştirmede hem yayında çalışır.
5. **Authentication → Ayarlar → Yetkili alan adları** → `haber10da.net` ve `www.haber10da.net` ekleyin (`localhost` zaten var).
6. **Authentication → Şablonlar** → e-posta dilini Türkçe yapın, gönderen adını `haber10da` olarak değiştirin.
7. **Proje ayarları → Hizmet hesapları → Yeni özel anahtar oluştur** → inen dosyayı proje köküne `servis-hesabi.json` adıyla koyun. (Bu dosya gizlidir; Git'e girmez.)

## 2. Çalıştırma

```bash
cp .env.ornek .env          # geliştirmede NODE_ENV=development yapın
npm install
npm start                   # http://localhost:3000
```

## 3. İlk yöneticiyi atama

Siteye bir kez giriş yaptıktan sonra:

```bash
npm run rol -- sizin@epostaniz.com yonetici
```

Sonraki rol değişiklikleri ya bu komutla ya da yöneticinin çağırabileceği `POST /api/yonetim/rol` ucuyla yapılır.
Rolü değişen kullanıcının oturumu kapatılır; yeniden girişte yeni rolü geçerli olur.

## 4. Sunucu (Contabo / Ubuntu)

```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx
sudo npm i -g pm2

# Uygulama
cd /var/www/haber10da && npm ci --omit=dev
pm2 start sunucu.js --name haber10da && pm2 save && pm2 startup
```

`/etc/nginx/sites-available/haber10da`:

```nginx
server {
    server_name haber10da.net www.haber10da.net;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/haber10da /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d haber10da.net -d www.haber10da.net
```

> İleride `helmet` eklenirse `crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }` verilmeli; aksi hâlde Google/GitHub açılır penceresi çalışmaz.

## API

| Uç | Yetki | Açıklama |
|---|---|---|
| `POST /api/oturum/ac` | — | Firebase kimlik belirtecini oturum çerezine çevirir |
| `POST /api/oturum/kapat` | — | Oturumu kapatır |
| `GET /api/ben` | giriş | Kullanıcı bilgisi ve rolü |
| `GET /api/haberler` | — | Haber listesi |
| `POST /api/haberler` | editor, yonetici | Haber ekler |
| `GET /api/yonetim/kullanicilar` | yonetici | Kullanıcı listesi |
| `POST /api/yonetim/rol` | yonetici | `{ uid, rol }` ile rol atar |

## Akış

1. Tarayıcı Firebase ile giriş yapar (açılır pencere ya da e-posta/parola).
2. Firebase'in verdiği kimlik belirteci `/api/oturum/ac` ucuna gönderilir.
3. Sunucu belirteci Admin SDK ile doğrular ve 5 günlük `HttpOnly` oturum çerezi oluşturur.
4. Sonraki her istekte `oturumGerekli` çerezi doğrular, `rolGerekli(...)` rolü denetler.
