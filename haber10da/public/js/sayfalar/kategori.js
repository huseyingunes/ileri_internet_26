import { api } from '../api.js';
import { html, $ } from '../yardimci.js';
import { haberKarti } from '../bilesenler.js';
import { renkleriUygula } from '../yonlendirici.js';

export async function goster(kok, { slug }) {
  const veri = await api.haberler({ kategori: slug, limit: 12 });
  const k = veri.kategori;
  kok.innerHTML = String(html`
    <header class="sayfa-baslik">
      <a class="haber__kategori" href="/kategori/${k.slug}" data-renk="${k.renk}">${k.ad}</a>
      <h1>${k.ad} haberleri</h1>
      <p>${veri.toplam} haber</p>
    </header>
    ${veri.haberler.length
      ? html`<div class="haber-listesi" id="liste">${veri.haberler.map((h, i) => haberKarti(h, { onde: i === 0 }))}</div>`
      : html`<div class="bos"><h2>Bu kategoride henüz haber yok</h2><p>Yeni haberler yayımlandıkça burada görünecek.</p></div>`}
    ${veri.sayfaSayisi > 1 ? html`<div class="daha-fazla"><button class="dugme dugme--ikincil" id="daha" type="button">Daha fazla haber</button></div>` : ''}`);

  let sayfa = 1;
  $('#daha', kok)?.addEventListener('click', async (e) => {
    const s = await api.haberler({ kategori: slug, limit: 12, sayfa: ++sayfa });
    const kap = document.createElement('div');
    kap.innerHTML = String(html`${s.haberler.map((h) => haberKarti(h))}`);
    renkleriUygula(kap);
    $('#liste', kok).append(...kap.children);
    if (sayfa >= s.sayfaSayisi) e.currentTarget.parentElement.remove();
  });
  document.title = `${k.ad} — haber10da`;
}
