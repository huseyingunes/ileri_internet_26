// =====================================================================
// Veritabanı katmanı — SQLite (Node yerleşik node:sqlite modülü)
// Gereksinim: Node.js 22.13 ya da üzeri. Ek paket kurulumu gerektirmez.
// Sunucu her açılışta ogrenciler.csv dosyasını okuyup öğrenci listesini
// veritabanına işler (var olan numaraların adı güncellenir).
// =====================================================================

const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

const VT_YOLU = path.join(__dirname, "sinav.db");
const CSV_YOLU = path.join(__dirname, "ogrenciler.csv");

const vt = new DatabaseSync(VT_YOLU);

vt.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS ogrenciler (
    numara        TEXT PRIMARY KEY,
    ad            TEXT NOT NULL,
    belirtec      TEXT,
    durum         TEXT NOT NULL DEFAULT 'baslamadi',  -- baslamadi | devam | tamamlandi
    giris_zamani  TEXT,
    bitis_zamani  TEXT
  );

  CREATE TABLE IF NOT EXISTS cevaplar (
    numara      TEXT NOT NULL,
    soru_no     INTEGER NOT NULL,
    cevap       TEXT,                 -- JSON olarak saklanır
    guncelleme  TEXT NOT NULL,
    PRIMARY KEY (numara, soru_no)
  );

  CREATE TABLE IF NOT EXISTS sonuclar (
    numara         TEXT PRIMARY KEY,
    otomatik_puan  REAL NOT NULL,     -- özdevimli değerlendirilen bölümlerin puanı
    otomatik_tam   REAL NOT NULL,     -- bu bölümlerden alınabilecek en yüksek puan
    ayrinti        TEXT NOT NULL,     -- soru bazında sonuçlar (JSON)
    zaman          TEXT NOT NULL
  );
`);

// ---------- Öğrenci listesini CSV'den yükleme ----------
// Biçim: her satırda  numara;ad soyad   (noktalı virgül ya da virgül)

function ogrencileriYukle() {
  if (!fs.existsSync(CSV_YOLU)) {
    console.warn("Uyarı: ogrenciler.csv bulunamadı; öğrenci listesi yüklenmedi.");
    return 0;
  }
  const satirlar = fs.readFileSync(CSV_YOLU, "utf8")
    .split(/\r?\n/)
    .map(function (s) { return s.trim(); })
    .filter(Boolean);

  const ekle = vt.prepare(
    "INSERT INTO ogrenciler (numara, ad) VALUES (?, ?) " +
    "ON CONFLICT(numara) DO UPDATE SET ad = excluded.ad"
  );

  let sayac = 0;
  for (const satir of satirlar) {
    if (/^numara\s*[;,]/i.test(satir)) continue;  // başlık satırı
    const ayirici = satir.includes(";") ? ";" : ",";
    const parcalar = satir.split(ayirici);
    const numara = (parcalar[0] || "").trim();
    const ad = parcalar.slice(1).join(" ").replace(/\s+/g, " ").trim();
    if (!numara || !ad) continue;
    ekle.run(numara, ad);
    sayac++;
  }
  return sayac;
}

// ---------- Sorgular ----------

const sorgular = {
  numaraylaBul: vt.prepare("SELECT * FROM ogrenciler WHERE numara = ?"),
  belirtecleBul: vt.prepare("SELECT * FROM ogrenciler WHERE belirtec = ?"),
  girisIsle: vt.prepare(
    "UPDATE ogrenciler SET belirtec = ?, giris_zamani = COALESCE(giris_zamani, ?), " +
    "durum = CASE WHEN durum = 'baslamadi' THEN 'devam' ELSE durum END WHERE numara = ?"
  ),
  cevapYaz: vt.prepare(
    "INSERT INTO cevaplar (numara, soru_no, cevap, guncelleme) VALUES (?, ?, ?, ?) " +
    "ON CONFLICT(numara, soru_no) DO UPDATE SET cevap = excluded.cevap, guncelleme = excluded.guncelleme"
  ),
  cevaplariGetir: vt.prepare("SELECT soru_no, cevap FROM cevaplar WHERE numara = ?"),
  bitir: vt.prepare("UPDATE ogrenciler SET durum = 'tamamlandi', bitis_zamani = ? WHERE numara = ?"),
  sonucYaz: vt.prepare(
    "INSERT INTO sonuclar (numara, otomatik_puan, otomatik_tam, ayrinti, zaman) VALUES (?, ?, ?, ?, ?) " +
    "ON CONFLICT(numara) DO UPDATE SET otomatik_puan = excluded.otomatik_puan, " +
    "otomatik_tam = excluded.otomatik_tam, ayrinti = excluded.ayrinti, zaman = excluded.zaman"
  ),
  sonucGetir: vt.prepare("SELECT * FROM sonuclar WHERE numara = ?")
};

function kayitliCevaplar(numara) {
  const cevaplar = {};
  for (const satir of sorgular.cevaplariGetir.all(numara)) {
    try { cevaplar[satir.soru_no] = JSON.parse(satir.cevap); }
    catch (hata) { cevaplar[satir.soru_no] = null; }
  }
  return cevaplar;
}

module.exports = { vt, sorgular, ogrencileriYukle, kayitliCevaplar };
