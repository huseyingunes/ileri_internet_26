// =====================================================================
// Özdevimli değerlendirme — Bölüm A (çoktan seçmeli), B (kısa cevap)
// ve C (eşleştirme) sunucu tarafında puanlanır.
// Bölüm D ve E (açık uçlu, 41-50) öğretim elemanınca değerlendirilir.
// Puanlama: her soru 2 puan (toplam 100; özdevimli bölüm 80).
// =====================================================================

const { SORULAR } = require("./sorular.js");
const { CEVAP_ANAHTARI } = require("./cevap_anahtari.js");

const SORU_PUANI = 2;
const HARFLER = "abcdefghijklmnop";

// ---------- Kısa cevaplar için esnek karşılaştırma ----------

function normallestir(metin) {
  return String(metin == null ? "" : metin)
    .toLocaleLowerCase("tr")
    .replace(/[.,;:!?'"()\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const AKSAN_TABLOSU = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u" };

function sadelestir(metin) {
  return normallestir(metin).replace(/[çğıöşüâîû]/g, function (h) {
    return AKSAN_TABLOSU[h] || h;
  });
}

function kisaCevapDogruMu(verilen, kabulListesi) {
  const n = normallestir(verilen);
  const s = sadelestir(verilen);
  if (!n) return false;
  return kabulListesi.some(function (kabul) {
    return normallestir(kabul) === n || sadelestir(kabul) === s;
  });
}

// ---------- Soru bazında puanlama ----------

function soruyuPuanla(soru, cevap) {
  const anahtar = CEVAP_ANAHTARI[soru.no];

  if (soru.tur === "acik_kisa" || soru.tur === "acik_uzun") {
    const bos = cevap == null || String(cevap).trim() === "";
    return {
      no: soru.no, tur: soru.tur,
      durum: bos ? "bos" : "degerlendirilecek",
      puan: null, tam: SORU_PUANI
    };
  }

  if (soru.tur === "coktan_secmeli") {
    const bos = cevap == null || cevap === "";
    const dogruHarf = HARFLER[anahtar.dogru];
    const dogru = !bos && String(cevap).toLowerCase() === dogruHarf;
    return {
      no: soru.no, tur: soru.tur,
      durum: bos ? "bos" : (dogru ? "dogru" : "yanlis"),
      puan: dogru ? SORU_PUANI : 0, tam: SORU_PUANI
    };
  }

  if (soru.tur === "kisa_cevap") {
    const bos = cevap == null || String(cevap).trim() === "";
    const dogru = !bos && kisaCevapDogruMu(cevap, anahtar);
    return {
      no: soru.no, tur: soru.tur,
      durum: bos ? "bos" : (dogru ? "dogru" : "yanlis"),
      puan: dogru ? SORU_PUANI : 0, tam: SORU_PUANI
    };
  }

  if (soru.tur === "eslestirme") {
    const verilen = Array.isArray(cevap) ? cevap : [];
    const ciftSayisi = anahtar.length;
    let dogruCift = 0, doluCift = 0;
    anahtar.forEach(function (dogruHarf, i) {
      const v = verilen[i];
      if (v != null && v !== "") doluCift++;
      if (v != null && String(v).toLowerCase() === dogruHarf) dogruCift++;
    });
    const puan = Math.round((SORU_PUANI * dogruCift / ciftSayisi) * 100) / 100;
    let durum;
    if (doluCift === 0) durum = "bos";
    else if (dogruCift === ciftSayisi) durum = "dogru";
    else if (dogruCift > 0) durum = "kismi";
    else durum = "yanlis";
    return {
      no: soru.no, tur: soru.tur, durum: durum,
      puan: puan, tam: SORU_PUANI,
      dogruCift: dogruCift, ciftSayisi: ciftSayisi
    };
  }

  return { no: soru.no, tur: soru.tur, durum: "bos", puan: 0, tam: SORU_PUANI };
}

// ---------- Tüm sınavı puanlama ----------

function sinaviPuanla(cevaplar) {
  const maddeler = SORULAR.map(function (soru) {
    return soruyuPuanla(soru, cevaplar[soru.no]);
  });

  let otomatikPuan = 0, otomatikTam = 0, elleTam = 0;
  maddeler.forEach(function (madde) {
    if (madde.puan === null) { elleTam += madde.tam; }
    else { otomatikPuan += madde.puan; otomatikTam += madde.tam; }
  });

  return {
    otomatikPuan: Math.round(otomatikPuan * 100) / 100,
    otomatikTam: otomatikTam,       // 80
    elleTam: elleTam,               // 20 (41-50. sorular)
    maddeler: maddeler
  };
}

module.exports = { sinaviPuanla };
