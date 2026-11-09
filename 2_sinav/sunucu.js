// =====================================================================
// İleri İnternet Programlama — 2. Sınav sunucusu
// Çalıştırma:  node sunucu.js          (2_sinav klasörü içinden)
// Gereksinim:  Node.js 22.13+ (SQLite için yerleşik node:sqlite modülü)
// Kapı: 9875 — öğrenciler http://SUNUCU_ADRESI:9875 adresine girer.
//
// Uç noktalar:
//   POST /api/giris   { numara }  ya da  { belirtec }
//   POST /api/kaydet  { belirtec, cevaplar: { soruNo: cevap, ... } }
//   POST /api/bitir   { belirtec }
// =====================================================================

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const { sorgular, ogrencileriYukle, kayitliCevaplar } = require("./veritabani.js");
const { sinaviPuanla } = require("./degerlendirme.js");

const KAPI = 9875;
const SUNUCU_ADI = "0.0.0.0";
const KOK = __dirname;

// Tarayıcıya ASLA verilmeyecek dosyalar:
const YASAKLI = new Set([
  "sunucu.js", "veritabani.js", "degerlendirme.js",
  "cevap_anahtari.js", "ogrenciler.csv",
  "sinav.db", "sinav.db-wal", "sinav.db-shm"
]);

const TURLER = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

// ---------- Yardımcılar ----------

function jsonYanit(yanit, durumKodu, veri) {
  const govde = JSON.stringify(veri);
  yanit.writeHead(durumKodu, { "Content-Type": "application/json; charset=utf-8" });
  yanit.end(govde);
}

function govdeOku(istek) {
  return new Promise(function (coz, reddet) {
    let boyut = 0;
    const parcalar = [];
    istek.on("data", function (parca) {
      boyut += parca.length;
      if (boyut > 512 * 1024) {           // 512 KB üst sınır
        reddet(new Error("Gövde çok büyük"));
        istek.destroy();
        return;
      }
      parcalar.push(parca);
    });
    istek.on("end", function () {
      try { coz(JSON.parse(Buffer.concat(parcalar).toString("utf8") || "{}")); }
      catch (hata) { reddet(new Error("Geçersiz JSON")); }
    });
    istek.on("error", reddet);
  });
}

function ogrenciOzeti(ogrenci) {
  return { numara: ogrenci.numara, ad: ogrenci.ad, durum: ogrenci.durum };
}

function sonucuGetir(numara) {
  const satir = sorgular.sonucGetir.get(numara);
  if (!satir) return null;
  return {
    otomatikPuan: satir.otomatik_puan,
    otomatikTam: satir.otomatik_tam,
    maddeler: JSON.parse(satir.ayrinti),
    zaman: satir.zaman
  };
}

// ---------- API işleyicileri ----------

function girisIsle(govde, yanit) {
  let ogrenci = null;

  if (govde.belirtec && typeof govde.belirtec === "string") {
    ogrenci = sorgular.belirtecleBul.get(govde.belirtec);
    if (!ogrenci) return jsonYanit(yanit, 401, { hata: "Oturum bulunamadı; numaranızla yeniden giriş yapınız." });
  } else {
    const numara = String(govde.numara || "").trim();
    if (!numara || numara.length > 32) {
      return jsonYanit(yanit, 400, { hata: "Geçerli bir öğrenci numarası giriniz." });
    }
    ogrenci = sorgular.numaraylaBul.get(numara);
    if (!ogrenci) {
      return jsonYanit(yanit, 404, { hata: "Bu numara öğrenci listesinde bulunamadı." });
    }
    const belirtec = crypto.randomUUID();
    sorgular.girisIsle.run(belirtec, new Date().toISOString(), numara);
    ogrenci = sorgular.numaraylaBul.get(numara);
  }

  const paket = {
    ...ogrenciOzeti(ogrenci),
    belirtec: ogrenci.belirtec,
    cevaplar: kayitliCevaplar(ogrenci.numara)
  };
  if (ogrenci.durum === "tamamlandi") paket.sonuc = sonucuGetir(ogrenci.numara);
  jsonYanit(yanit, 200, paket);
}

function kimlikDenetle(govde, yanit) {
  const belirtec = String(govde.belirtec || "");
  const ogrenci = belirtec ? sorgular.belirtecleBul.get(belirtec) : null;
  if (!ogrenci) {
    jsonYanit(yanit, 401, { hata: "Oturum geçersiz; numaranızla yeniden giriş yapınız." });
    return null;
  }
  return ogrenci;
}

function kaydetIsle(govde, yanit) {
  const ogrenci = kimlikDenetle(govde, yanit);
  if (!ogrenci) return;
  if (ogrenci.durum === "tamamlandi") {
    return jsonYanit(yanit, 409, { hata: "Sınav tamamlandı; cevaplar artık değiştirilemez." });
  }

  const cevaplar = govde.cevaplar;
  if (!cevaplar || typeof cevaplar !== "object" || Array.isArray(cevaplar)) {
    return jsonYanit(yanit, 400, { hata: "Cevap paketi geçersiz." });
  }

  const zaman = new Date().toISOString();
  let yazilan = 0;
  for (const anahtar of Object.keys(cevaplar)) {
    const soruNo = Number(anahtar);
    if (!Number.isInteger(soruNo) || soruNo < 1 || soruNo > 50) continue;
    sorgular.cevapYaz.run(ogrenci.numara, soruNo, JSON.stringify(cevaplar[anahtar]), zaman);
    yazilan++;
  }
  jsonYanit(yanit, 200, { tamam: true, yazilan: yazilan, zaman: zaman });
}

function bitirIsle(govde, yanit) {
  const ogrenci = kimlikDenetle(govde, yanit);
  if (!ogrenci) return;

  if (ogrenci.durum === "tamamlandi") {
    return jsonYanit(yanit, 200, { tamam: true, sonuc: sonucuGetir(ogrenci.numara) });
  }

  const cevaplar = kayitliCevaplar(ogrenci.numara);
  const sonuc = sinaviPuanla(cevaplar);
  const zaman = new Date().toISOString();

  sorgular.sonucYaz.run(
    ogrenci.numara, sonuc.otomatikPuan, sonuc.otomatikTam,
    JSON.stringify(sonuc.maddeler), zaman
  );
  sorgular.bitir.run(zaman, ogrenci.numara);

  jsonYanit(yanit, 200, {
    tamam: true,
    sonuc: {
      otomatikPuan: sonuc.otomatikPuan,
      otomatikTam: sonuc.otomatikTam,
      maddeler: sonuc.maddeler,
      zaman: zaman
    }
  });
}

// ---------- Statik dosya sunumu ----------

function statikSun(istekYolu, yanit) {
  if (istekYolu === "/") istekYolu = "/index.html";

  const goreli = istekYolu.replace(/^[/\\]+/, "");
  const dosyaYolu = path.resolve(KOK, goreli);
  const kokAyracli = KOK.endsWith(path.sep) ? KOK : KOK + path.sep;

  if (!dosyaYolu.startsWith(kokAyracli)) {
    yanit.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    return yanit.end("Bu dosyaya erişilemez");
  }

  const dosyaAdi = path.basename(dosyaYolu).toLowerCase();
  const uzanti = path.extname(dosyaYolu).toLowerCase();

  if (YASAKLI.has(dosyaAdi) || dosyaAdi.startsWith(".") || !TURLER[uzanti]) {
    yanit.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return yanit.end("Sayfa bulunamadı");
  }

  fs.readFile(dosyaYolu, function (hata, veri) {
    if (hata) {
      yanit.writeHead(hata.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      return yanit.end("Sayfa bulunamadı");
    }
    yanit.writeHead(200, { "Content-Type": TURLER[uzanti], "Cache-Control": "no-store" });
    yanit.end(veri);
  });
}

// ---------- Sunucu ----------

const sunucu = http.createServer(async function (istek, yanit) {
  let yol = "/";
  try {
    yol = decodeURIComponent(new URL(istek.url, "http://" + (istek.headers.host || SUNUCU_ADI)).pathname);
  } catch (hata) {
    yanit.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    return yanit.end("Adres okunamadı");
  }

  if (yol.startsWith("/api/")) {
    if (istek.method !== "POST") {
      return jsonYanit(yanit, 405, { hata: "Yalnızca POST desteklenir." });
    }
    let govde;
    try { govde = await govdeOku(istek); }
    catch (hata) { return jsonYanit(yanit, 400, { hata: hata.message }); }

    try {
      if (yol === "/api/giris") return girisIsle(govde, yanit);
      if (yol === "/api/kaydet") return kaydetIsle(govde, yanit);
      if (yol === "/api/bitir") return bitirIsle(govde, yanit);
      return jsonYanit(yanit, 404, { hata: "Böyle bir uç nokta yok." });
    } catch (hata) {
      console.error(hata);
      return jsonYanit(yanit, 500, { hata: "Sunucu hatası." });
    }
  }

  statikSun(yol, yanit);
});

const yuklenen = ogrencileriYukle();
console.log("Öğrenci listesi yüklendi: " + yuklenen + " kayıt.");

sunucu.listen(KAPI, SUNUCU_ADI, function () {
  console.log("Sınav sunucusu dinliyor: http://localhost:" + KAPI);
});

sunucu.on("error", function (hata) {
  if (hata.code === "EADDRINUSE") {
    console.error("Kapı " + KAPI + " kullanımda. Başka bir süreç kapatılmalı.");
  } else {
    console.error(hata.message);
  }
  process.exit(1);
});
