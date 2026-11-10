// Haber detay: 10 saniyelik özet kutusu, tam metin, canlı okur sayısı (WebSocket), benzer haberler (vektör).
import { api } from '../api.js';
import { html, $, saatTarih, okumaMetni, basHarfler } from '../yardimci.js';
import { haberKarti } from '../bilesenler.js';
import { canliOlaylar, odayaKatil, odadanAyril } from '../canli.js';
import { renkleriUygula, ciz } from '../yonlendirici.js';

const OZET_KAYNAK = {
  editor: 'Özeti editör yazdı',
  yz: 'Özeti yapay zekâ çıkardı, editör denetiminden geçmedi',
  cikarimsal: 'Özet, metnin ilk cümlelerinden otomatik çıkarıldı',
};

export async function goster(kok, { slug }) {
  const h = await api.haber(slug);
  const paragraflar = h.icerik.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  kok.innerHTML = String(html`
    <article class="makale">
      <div class="makale__ust">
        <a class="haber__kategori" href="/kategori/${h.kategori.slug}" data-renk="${h.kategori.renk}">${h.kategori.ad}</a>
        ${h.sonDakika ? html`<span class="son-dakika__etiket"><span class="canli-nokta"></span>Son dakika</span>` : ''}
        ${h.ornek ? html`<span class="etiket-ornek">Örnek içerik</span>` : ''}
      </div>
      <h1>${h.baslik}</h1>
      <p class="makale__spot">${h.spot}</p>
      <div class="makale__meta">
        <span class="yazar"><span class="avatar">${h.yazar.avatar ? html`<img src="${h.yazar.avatar}" alt="" />` : basHarfler(h.yazar.ad)}</span>${h.yazar.ad}</span>
        <time datetime="${h.yayinTarihi}">${saatTarih(h.yayinTarihi)}</time>
        <span>${okumaMetni(h.okumaSuresi)}</span>
        <span class="okuyan" id="okuyan" hidden><span class="canli-nokta"></span><span></span></span>
      </div>

      ${h.ozet
        ? html`<section class="ozet-kutu" aria-labelledby="ozet-baslik">
            <div class="ozet-kutu__halka" aria-hidden="true">
              <svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="4" /><circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="150.8" stroke-dashoffset="0" transform="rotate(-90 28 28)" /></svg>
              <strong>10</strong>
            </div>
            <div>
              <h2 id="ozet-baslik">10 saniyede</h2>
              <p>${h.ozet}</p>
              <footer>
                ${h.etiketler.map((e) => html`<a class="cip" href="/arama?q=${encodeURIComponent(e)}">${e}</a>`)}
                <span class="ozet-kaynak">${OZET_KAYNAK[h.ozetKaynak] ?? ''}</span>
              </footer>
            </div>
          </section>`
        : html`<p class="ipucu">Özet hazırlanıyor; birkaç saniye içinde görünecek.</p>`}

      <div class="metin">${paragraflar.map((p) => html`<p>${p}</p>`)}</div>

      ${h.kaynak && /^https?:\/\//.test(h.kaynak.url)
        ? html`<p class="kaynak-not">Bu haber <strong>${h.kaynak.ad}</strong> kaynağından derlendi. Tamamı için: <a href="${h.kaynak.url}" rel="noopener noreferrer" target="_blank">kaynağa git</a></p>`
        : ''}
    </article>
    <section class="benzer" id="benzer" aria-labelledby="benzer-baslik"></section>`);

  document.title = `${h.baslik} — haber10da`;

  // Benzer haberler: sayfa çizildikten sonra gelsin, ilk görüntüyü bekletmesin
  api.benzer(slug).then((liste) => {
    if (!liste.length) return;
    const b = $('#benzer', kok);
    if (!b) return;
    b.innerHTML = String(html`<div class="bolum-baslik"><h2 id="benzer-baslik">Benzer haberler</h2><p>İçerik benzerliğine göre</p></div>
      <div class="haber-listesi">${liste.map((x) => haberKarti(x))}</div>`);
    renkleriUygula(b);
  }).catch(() => {});

  // Canlı okur sayısı
  const okuyan = $('#okuyan', kok);
  const okurDinle = (e) => {
    if (e.detail.oda !== slug) return;
    okuyan.hidden = false;
    okuyan.lastElementChild.textContent = e.detail.sayi === 1 ? 'Şu an yalnızca siz okuyorsunuz' : `Şu an ${e.detail.sayi} kişi okuyor`;
  };
  canliOlaylar.addEventListener('ws-okur', okurDinle);
  odayaKatil(slug);

  // Özet arka planda üretildiyse sayfayı yenile
  const guncellendi = (e) => {
    if (e.detail.slug === slug && !h.ozet && e.detail.ozet) ciz();
  };
  canliOlaylar.addEventListener('haber-guncellendi', guncellendi);

  return () => {
    canliOlaylar.removeEventListener('ws-okur', okurDinle);
    canliOlaylar.removeEventListener('haber-guncellendi', guncellendi);
    odadanAyril();
  };
}
