import { api } from '../api.js';
import { html, $, zamanOnce, vurgula } from '../yardimci.js';
import { git, renkleriUygula } from '../yonlendirici.js';

const MOTOR = { postgresql: 'PostgreSQL tam metin arama', elasticsearch: 'Elasticsearch' };

export async function goster(kok, _p, sorgu) {
  const q = sorgu.get('q') ?? '';
  kok.innerHTML = String(html`
    <div class="dar">
      <header class="sayfa-baslik"><h1>Arama</h1><p>Türkçe kök bulma kullanılır: "kitapları" araması "kitap" geçen haberleri de bulur.</p></header>
      <form class="arama-formu" id="arama-formu" role="search">
        <label class="gorunmez" for="q">Aranacak kelimeler</label>
        <input class="girdi" id="q" name="q" type="search" value="${q}" placeholder="Ne aramıştınız?" minlength="2" maxlength="100" autofocus />
        <button class="dugme dugme--kobalt" type="submit">Ara</button>
      </form>
      <div id="sonuclar"></div>
    </div>`);

  $('#arama-formu', kok).addEventListener('submit', (e) => {
    e.preventDefault();
    const deger = $('#q', kok).value.trim();
    if (deger.length >= 2) git(`/arama?q=${encodeURIComponent(deger)}`);
  });

  document.title = q ? `"${q}" araması — haber10da` : 'Arama — haber10da';
  if (q.length < 2) return;

  const alan = $('#sonuclar', kok);
  try {
    const s = await api.ara(q);
    alan.innerHTML = String(html`
      <p class="arama-bilgi">${s.toplam ? `${s.toplam} sonuç bulundu` : 'Sonuç bulunamadı'}, arama motoru: ${MOTOR[s.motor] ?? s.motor}</p>
      ${s.sonuclar.length
        ? s.sonuclar.map(
            (h) => html`<article class="arama-sonuc">
              <a class="haber__kategori" href="/kategori/${h.kategori.slug}" data-renk="${h.kategori.renk}">${h.kategori.ad}</a>
              <h2 class="haber__baslik"><a href="/haber/${h.slug}">${h.baslik}</a></h2>
              <p class="haber__spot">${vurgula(h.vurgu ?? h.spot)}</p>
              <div class="meta"><time datetime="${h.yayinTarihi}">${zamanOnce(h.yayinTarihi)}</time></div>
            </article>`,
          )
        : html`<div class="bos"><p>Farklı ya da daha az kelimeyle deneyin. Sorunuzu doğal dille sormak isterseniz <a class="cip" href="/asistan?s=${encodeURIComponent(q)}">Haberlere sor</a> sayfasını kullanın.</p></div>`}`);
    renkleriUygula(alan);
  } catch (err) {
    alan.innerHTML = String(html`<p class="ileti ileti--hata">${err.message}</p>`);
  }
}
