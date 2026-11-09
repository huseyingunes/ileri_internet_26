// =====================================================================
// İleri İnternet Programlama — 2. Sınav: istemci mantığı
// - Öğrenci numarasıyla giriş (sunucu doğrular)
// - Her değişiklik sunucuya anında kaydedilir (bağlantı koparsa
//   yerel yedekte bekletilir ve bağlantı dönünce yeniden gönderilir)
// - "Sınavı Bitir" sonrası sonuçlar aynı sayfada görüntülenir
// =====================================================================

(function () {
  "use strict";

  const OTURUM_ANAHTARI = "sinav2_oturum";
  const HARFLER = "abcdefghijklmnop";
  const GONDERIM_GECIKMESI = 600;    // ms — yazarken bekleme
  const YENIDEN_DENEME = 4000;       // ms — bağlantı kopunca deneme aralığı

  const BOLUMLER = [
    { tur: "coktan_secmeli", baslik: "Bölüm A — Çoktan Seçmeli",
      aciklama: "Her soru için yalnızca bir seçenek işaretleyiniz." },
    { tur: "kisa_cevap", baslik: "Bölüm B — Kısa Cevap",
      aciklama: "Cevaplar bir ya da iki kelimedir; cümle kurmayınız." },
    { tur: "eslestirme", baslik: "Bölüm C — Eşleştirme",
      aciklama: "Soldaki her ögenin karşısına, sağdaki açıklamalardan uygun olanın harfini seçiniz. Her harf yalnızca bir kez kullanılır." },
    { tur: "acik_kisa", baslik: "Bölüm D — Kısa Açıklama",
      aciklama: "Her soruyu bir ya da iki cümleyle cevaplayınız." },
    { tur: "acik_uzun", baslik: "Bölüm E — Açıklamalı Sorular",
      aciklama: "Her soruyu bir ya da iki paragrafla cevaplayınız. Kod yazmanız beklenmez; kavrayışınızı kendi cümlelerinizle anlatınız." }
  ];

  const ZORLUK_SINIFI = {
    "kolay": "kolay", "normal": "normal", "zor": "zor",
    "çok zor": "cok-zor", "çok çok zor": "cok-cok-zor"
  };

  const TUR_ADLARI = {
    coktan_secmeli: "Çoktan seçmeli", kisa_cevap: "Kısa cevap",
    eslestirme: "Eşleştirme", acik_kisa: "Kısa açıklama", acik_uzun: "Açıklamalı"
  };

  const DURUM_ADLARI = {
    dogru: "Doğru", yanlis: "Yanlış", kismi: "Kısmen doğru",
    bos: "Boş", degerlendirilecek: "Değerlendirilecek"
  };

  // ---------- Durum ----------

  let oturum = null;            // { numara, ad, belirtec, durum }
  const cevaplar = {};          // soruNo -> cevap
  const kirli = new Set();      // sunucuya henüz yazılmamış soru numaraları
  let gonderimSayaci = null;
  let denemeSayaci = null;
  let gonderimde = false;

  const kok = document.getElementById("sinav-kok");

  // ---------- Yardımcılar ----------

  function el(etiket, sinif, icerik) {
    const e = document.createElement(etiket);
    if (sinif) e.className = sinif;
    if (icerik !== undefined) e.textContent = icerik;
    return e;
  }

  function ekranGoster(ad) {
    ["giris-ekrani", "sinav-ekrani", "sonuc-ekrani"].forEach(function (kimlik) {
      document.getElementById(kimlik).classList.toggle("gizli", kimlik !== ad);
    });
    document.getElementById("alt-cubuk")
      .classList.toggle("gizli", ad !== "sinav-ekrani");
  }

  async function apiIstek(yol, veri) {
    const yanit = await fetch(yol, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(veri)
    });
    const govde = await yanit.json().catch(function () { return {}; });
    if (!yanit.ok) {
      const hata = new Error(govde.hata || "İstek başarısız (" + yanit.status + ")");
      hata.kod = yanit.status;
      throw hata;
    }
    return govde;
  }

  function yerelKaydet(anahtar, deger) {
    try { localStorage.setItem(anahtar, JSON.stringify(deger)); } catch (hata) {}
  }
  function yerelOku(anahtar) {
    try {
      const ham = localStorage.getItem(anahtar);
      return ham ? JSON.parse(ham) : null;
    } catch (hata) { return null; }
  }

  // ---------- Soru oluşturma ----------

  // Fisher-Yates karıştırması — her girişte yeni bir soru sırası üretir
  function karistir(dizi) {
    const kopya = dizi.slice();
    for (let i = kopya.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const gecici = kopya[i]; kopya[i] = kopya[j]; kopya[j] = gecici;
    }
    return kopya;
  }

  function soruUstu(gosterimNo) {
    const ust = el("div", "soru-ust");
    ust.appendChild(el("span", "soru-no", "Soru " + gosterimNo));
    return ust;
  }

  function coktanSecmeliOlustur(soru, kart) {
    const kutu = el("div", "secenekler");
    soru.secenekler.forEach(function (metin, i) {
      const satir = el("label", "secenek");
      const radyo = document.createElement("input");
      radyo.type = "radio";
      radyo.name = "s" + soru.no;
      radyo.value = HARFLER[i];
      radyo.addEventListener("change", function () {
        cevapDegisti(soru.no, radyo.value);
      });
      satir.appendChild(radyo);
      satir.appendChild(el("span", "harf", HARFLER[i].toUpperCase() + ")"));
      satir.appendChild(el("span", null, metin));
      kutu.appendChild(satir);
    });
    kart.appendChild(kutu);
  }

  function kisaCevapOlustur(soru, kart) {
    const girdi = document.createElement("input");
    girdi.type = "text";
    girdi.className = "kisa-girdi";
    girdi.name = "s" + soru.no;
    girdi.placeholder = "Cevabınız (1-2 kelime)";
    girdi.autocomplete = "off";
    girdi.addEventListener("input", function () {
      cevapDegisti(soru.no, girdi.value.trim() || null);
    });
    kart.appendChild(girdi);
  }

  function eslestirmeOlustur(soru, kart) {
    const sarmal = el("div", "eslestirme-sarmal");
    const solKutu = el("div");

    soru.sol.forEach(function (oge, i) {
      const satir = el("div", "es-sol-satir");
      satir.appendChild(el("span", "oge", oge));
      const secim = document.createElement("select");
      secim.name = "s" + soru.no + "_" + i;
      const bos = document.createElement("option");
      bos.value = ""; bos.textContent = "—";
      secim.appendChild(bos);
      soru.sag.forEach(function (_, j) {
        const sec = document.createElement("option");
        sec.value = HARFLER[j];
        sec.textContent = HARFLER[j] + ")";
        secim.appendChild(sec);
      });
      secim.addEventListener("change", function () {
        const dizi = Array.isArray(cevaplar[soru.no])
          ? cevaplar[soru.no].slice() : soru.sol.map(function () { return null; });
        dizi[i] = secim.value || null;
        cevapDegisti(soru.no, dizi);
      });
      satir.appendChild(secim);
      solKutu.appendChild(satir);
    });

    const sagListe = el("ul", "es-sag-liste");
    soru.sag.forEach(function (metin, j) {
      const madde = el("li");
      madde.appendChild(el("span", "harf", HARFLER[j] + ")"));
      madde.appendChild(el("span", null, metin));
      sagListe.appendChild(madde);
    });

    sarmal.appendChild(solKutu);
    sarmal.appendChild(sagListe);
    kart.appendChild(sarmal);
  }

  function acikUcluOlustur(soru, kart, satirSayisi) {
    const girdi = document.createElement("textarea");
    girdi.className = "acik-girdi";
    girdi.name = "s" + soru.no;
    girdi.rows = satirSayisi;
    girdi.placeholder = satirSayisi <= 3 ? "Cevabınız (1-2 cümle)" : "Cevabınız (1-2 paragraf)";
    girdi.addEventListener("input", function () {
      cevapDegisti(soru.no, girdi.value.trim() ? girdi.value : null);
    });
    kart.appendChild(girdi);
  }

  function sayfayiKur() {
    kok.textContent = "";
    let gosterimNo = 0;

    BOLUMLER.forEach(function (bolum) {
      // Bölüm sırası sabittir; bölüm içindeki sorular her girişte karıştırılır
      const sorular = karistir(
        SORULAR.filter(function (s) { return s.tur === bolum.tur; })
      );
      if (!sorular.length) return;

      const baslik = el("div", "bolum-basligi");
      baslik.appendChild(el("h2", null, bolum.baslik + " (Soru " +
        (gosterimNo + 1) + "–" + (gosterimNo + sorular.length) + ")"));
      baslik.appendChild(el("p", null, bolum.aciklama));
      kok.appendChild(baslik);

      sorular.forEach(function (soru) {
        gosterimNo++;
        const kart = el("section", "soru");
        kart.id = "soru-" + soru.no;
        kart.appendChild(soruUstu(gosterimNo));
        kart.appendChild(el("p", "soru-metni", soru.soru));

        if (soru.tur === "coktan_secmeli") coktanSecmeliOlustur(soru, kart);
        else if (soru.tur === "kisa_cevap") kisaCevapOlustur(soru, kart);
        else if (soru.tur === "eslestirme") eslestirmeOlustur(soru, kart);
        else if (soru.tur === "acik_kisa") acikUcluOlustur(soru, kart, 3);
        else if (soru.tur === "acik_uzun") acikUcluOlustur(soru, kart, 9);

        kok.appendChild(kart);
      });
    });
  }

  // ---------- Cevapları arayüze yazma ----------

  function cevaplariUygula() {
    SORULAR.forEach(function (soru) {
      const cevap = cevaplar[soru.no];
      if (cevap === null || cevap === undefined) return;

      if (soru.tur === "coktan_secmeli") {
        const radyo = document.querySelector(
          'input[name="s' + soru.no + '"][value="' + cevap + '"]');
        if (radyo) radyo.checked = true;
      } else if (soru.tur === "eslestirme") {
        if (!Array.isArray(cevap)) return;
        cevap.forEach(function (harf, i) {
          if (!harf) return;
          const secim = document.querySelector(
            'select[name="s' + soru.no + "_" + i + '"]');
          if (secim) secim.value = harf;
        });
      } else {
        const girdi = document.querySelector('[name="s' + soru.no + '"]');
        if (girdi) girdi.value = cevap;
      }
    });
  }

  // ---------- Kayıt akışı ----------

  function cevapDegisti(soruNo, deger) {
    cevaplar[soruNo] = deger;
    kirli.add(soruNo);
    yerelKaydet("sinav2_yedek_" + oturum.numara, cevaplar);
    ilerlemeGuncelle();
    kayitDurumuYaz("bekliyor");
    clearTimeout(gonderimSayaci);
    gonderimSayaci = setTimeout(sunucuyaGonder, GONDERIM_GECIKMESI);
  }

  async function sunucuyaGonder() {
    if (gonderimde || !kirli.size || !oturum) return;
    gonderimde = true;
    kayitDurumuYaz("gonderiliyor");

    const gidenler = Array.from(kirli);
    const paket = {};
    gidenler.forEach(function (no) { paket[no] = cevaplar[no] === undefined ? null : cevaplar[no]; });

    try {
      await apiIstek("/api/kaydet", { belirtec: oturum.belirtec, cevaplar: paket });
      gidenler.forEach(function (no) { kirli.delete(no); });
      kayitDurumuYaz(kirli.size ? "bekliyor" : "kaydedildi");
      if (kirli.size) planlaYenidenDeneme(GONDERIM_GECIKMESI);
    } catch (hata) {
      if (hata.kod === 401) { oturumuKapat("Oturum geçersiz; yeniden giriş yapınız."); }
      else if (hata.kod === 409) { kayitDurumuYaz("kilitli"); }
      else {
        kayitDurumuYaz("baglanti-yok");
        planlaYenidenDeneme(YENIDEN_DENEME);
      }
    } finally {
      gonderimde = false;
    }
  }

  function planlaYenidenDeneme(sure) {
    clearTimeout(denemeSayaci);
    denemeSayaci = setTimeout(sunucuyaGonder, sure);
  }

  function kayitDurumuYaz(durum) {
    const kutu = document.getElementById("kayit-durumu");
    kutu.className = "kayit-durumu " + durum;
    if (durum === "kaydedildi") kutu.textContent = "✓ Kaydedildi";
    else if (durum === "gonderiliyor") kutu.textContent = "Kaydediliyor…";
    else if (durum === "bekliyor") kutu.textContent = "Kaydediliyor…";
    else if (durum === "baglanti-yok") kutu.textContent = "⚠ Bağlantı yok — yeniden denenecek";
    else if (durum === "kilitli") kutu.textContent = "Sınav tamamlandı";
    else kutu.textContent = "";
  }

  // ---------- İlerleme ----------

  function cevaplandiMi(soru) {
    const cevap = cevaplar[soru.no];
    if (cevap === null || cevap === undefined) return false;
    if (soru.tur === "eslestirme") {
      return Array.isArray(cevap) && cevap.length === soru.sol.length &&
        cevap.every(function (c) { return c !== null && c !== ""; });
    }
    return String(cevap).trim() !== "";
  }

  function ilerlemeGuncelle() {
    const toplam = SORULAR.length;
    let dolu = 0;
    SORULAR.forEach(function (soru) { if (cevaplandiMi(soru)) dolu++; });
    document.getElementById("ilerleme-metin").textContent =
      "Cevaplanan: " + dolu + " / " + toplam;
    document.getElementById("ilerleme-dolgu").style.width =
      (dolu / toplam * 100) + "%";
    return dolu;
  }

  // ---------- Giriş / oturum ----------

  async function girisYap(istekVerisi) {
    const paket = await apiIstek("/api/giris", istekVerisi);
    oturum = { numara: paket.numara, ad: paket.ad, belirtec: paket.belirtec, durum: paket.durum };
    yerelKaydet(OTURUM_ANAHTARI, { belirtec: paket.belirtec, numara: paket.numara });

    if (paket.durum === "tamamlandi" && paket.sonuc) {
      sonucuGoster(paket.sonuc);
      return;
    }

    // Sunucudaki cevapları yükle
    Object.keys(paket.cevaplar || {}).forEach(function (no) {
      cevaplar[Number(no)] = paket.cevaplar[no];
    });

    // Çevrimdışı kalan yedek varsa yalnızca sunucuda boş olan soruları doldur
    const yedek = yerelOku("sinav2_yedek_" + paket.numara);
    if (yedek) {
      Object.keys(yedek).forEach(function (no) {
        const n = Number(no);
        const sunucudaki = cevaplar[n];
        if ((sunucudaki === null || sunucudaki === undefined) &&
            yedek[no] !== null && yedek[no] !== undefined) {
          cevaplar[n] = yedek[no];
          kirli.add(n);
        }
      });
    }

    document.getElementById("ogrenci-kimlik").textContent =
      paket.ad + " · " + paket.numara;
    ekranGoster("sinav-ekrani");
    sayfayiKur();
    cevaplariUygula();
    ilerlemeGuncelle();
    kayitDurumuYaz(kirli.size ? "bekliyor" : "kaydedildi");
    if (kirli.size) sunucuyaGonder();
  }

  function oturumuKapat(mesaj) {
    oturum = null;
    try { localStorage.removeItem(OTURUM_ANAHTARI); } catch (hata) {}
    ekranGoster("giris-ekrani");
    if (mesaj) girisHatasi(mesaj);
  }

  function girisHatasi(mesaj) {
    const kutu = document.getElementById("giris-hata");
    kutu.textContent = mesaj;
    kutu.classList.remove("gizli");
  }

  // ---------- Bitirme ve sonuç ----------

  async function sinaviBitir() {
    const dolu = ilerlemeGuncelle();
    const eksik = SORULAR.length - dolu;
    const uyari = eksik > 0
      ? eksik + " soru boş görünüyor. Sınavı bitirmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
      : "Sınavı bitirmek istediğinizden emin misiniz? Bu işlem geri alınamaz.";
    if (!confirm(uyari)) return;

    // Bekleyen cevapları önce gönder
    clearTimeout(gonderimSayaci);
    if (kirli.size) {
      await sunucuyaGonder();
      if (kirli.size) {
        alert("Cevaplarınızın bir bölümü henüz sunucuya ulaşmadı. Bağlantınızı denetleyip yeniden deneyiniz.");
        return;
      }
    }

    try {
      const paket = await apiIstek("/api/bitir", { belirtec: oturum.belirtec });
      try { localStorage.removeItem("sinav2_yedek_" + oturum.numara); } catch (hata) {}
      sonucuGoster(paket.sonuc);
    } catch (hata) {
      alert("Sınav bitirilemedi: " + hata.message);
    }
  }

  function sonucuGoster(sonuc) {
    document.getElementById("sonuc-kimlik").textContent =
      oturum.ad + " · " + oturum.numara;

    const ozet = document.getElementById("sonuc-ozet");
    ozet.textContent = "";
    const puanSatiri = el("p", "sonuc-puan",
      "Özdevimli değerlendirilen bölümler (Soru 1–40): " +
      sonuc.otomatikPuan + " / " + sonuc.otomatikTam + " puan");
    ozet.appendChild(puanSatiri);
    ozet.appendChild(el("p", "sonuc-not",
      "Bölüm D ve E'deki açık uçlu sorular (41–50, toplam 20 puan) öğretim elemanı tarafından değerlendirilecektir."));

    const govde = document.querySelector("#sonuc-tablosu tbody");
    govde.textContent = "";
    sonuc.maddeler.forEach(function (madde) {
      const satir = document.createElement("tr");
      satir.appendChild(el("td", null, String(madde.no)));
      satir.appendChild(el("td", null, TUR_ADLARI[madde.tur] || madde.tur));
      const durumHucre = el("td");
      let durumMetni = DURUM_ADLARI[madde.durum] || madde.durum;
      if (madde.durum === "kismi") {
        durumMetni += " (" + madde.dogruCift + "/" + madde.ciftSayisi + " eşleşme)";
      }
      durumHucre.appendChild(el("span", "sonuc-rozet " + madde.durum, durumMetni));
      satir.appendChild(durumHucre);
      satir.appendChild(el("td", null,
        madde.puan === null ? "—" : madde.puan + " / " + madde.tam));
      govde.appendChild(satir);
    });

    ekranGoster("sonuc-ekrani");
  }

  // ---------- Başlatma ----------

  document.getElementById("giris-dugmesi").addEventListener("click", async function () {
    const numara = document.getElementById("giris-numara").value.trim();
    document.getElementById("giris-hata").classList.add("gizli");
    if (!numara) return girisHatasi("Öğrenci numaranızı giriniz.");
    try { await girisYap({ numara: numara }); }
    catch (hata) { girisHatasi(hata.message); }
  });

  document.getElementById("giris-numara").addEventListener("keydown", function (olay) {
    if (olay.key === "Enter") document.getElementById("giris-dugmesi").click();
  });

  document.getElementById("bitir-dugmesi").addEventListener("click", sinaviBitir);

  // Tarayıcı yeniden bağlanınca bekleyenleri gönder
  window.addEventListener("online", function () {
    if (kirli.size) sunucuyaGonder();
  });

  // Sayfa açılışı: kayıtlı oturum varsa kaldığı yerden sürdür
  (async function () {
    const kayitli = yerelOku(OTURUM_ANAHTARI);
    if (kayitli && kayitli.belirtec) {
      try { await girisYap({ belirtec: kayitli.belirtec }); return; }
      catch (hata) { /* oturum düşmüş; giriş ekranına in */ }
    }
    ekranGoster("giris-ekrani");
  })();

})();
