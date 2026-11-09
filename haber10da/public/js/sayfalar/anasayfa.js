// Anasayfa: "10 saniyede gündem" paneli + son haberler + en çok okunanlar.
import { api } from '../api.js';
import { html, $, $$, IKON, hareketAzalt, zamanOnce } from '../yardimci.js';
import { haberKarti, bilesenIzgarasi } from '../bilesenler.js';
import { canliOlaylar } from '../canli.js';
import { renkleriUygula } from '../yonlendirici.js';

const SURE = 10_000;
const CEVRE = 2 * Math.PI * 54;

function panelCiz(manset) {
  return html`
    <section class="on-saniye" aria-roledescription="otomatik akış" aria-label="10 saniyede gündem">
      <div class="on-saniye__serit" role="tablist" aria-label="Manşet haberleri">
        ${manset.map(
          (h, i) => html`<button class="serit-dugme" role="tab" type="button" data-i="${i}" aria-selected="${i === 0}" aria-controls="on-saniye-icerik">${h.kategori?.ad}</button>`,
        )}
      </div>
      <div class="on-saniye__icerik" id="on-saniye-icerik" role="tabpanel" aria-live="polite"></div>
      <div class="on-saniye__halka" aria-hidden="true">
        <svg viewBox="0 0 120 120"><circle class="iz" cx="60" cy="60" r="54" /><circle class="dolgu" cx="60" cy="60" r="54" stroke-dasharray="${CEVRE}" stroke-dashoffset="0" /></svg>
        <div class="on-saniye__sayi"><strong>10</strong><span>saniye</span></div>
      </div>
      <div class="on-saniye__alt">
        <a class="dugme" id="on-saniye-git" href="/">Haberin tamamını oku</a>
        <button class="dugme-ikon" type="button" data-yon="-1" aria-label="Önceki haber">${IKON.onceki}</button>
        <button class="dugme-ikon" type="button" id="on-saniye-oynat" aria-label="Duraklat">${IKON.duraklat}</button>
        <button class="dugme-ikon" type="button" data-yon="1" aria-label="Sonraki haber">${IKON.sonraki}</button>
        <span class="on-saniye__not">Her haber 10 saniyede. Üzerine gelince durur.</span>
      </div>
    </section>`;
}

function onSaniyeKur(kok, manset) {
  const panel = $('.on-saniye', kok);
  const icerik = $('#on-saniye-icerik', kok);
  const dolgu = $('.dolgu', panel);
  const sayi = $('.on-saniye__sayi strong', panel);
  const oynat = $('#on-saniye-oynat', panel);
  const git = $('#on-saniye-git', panel);
  const seritler = $$('.serit-dugme', panel);
  panel.style.setProperty('--adet', manset.length);

  let i = 0;
  let gecen = 0;
  let son = null;
  let calisiyor = !hareketAzalt();
  let duraklatildi = false; // fare/odak ile geçici durma
  let kare;

  function goster(yeni, { animasyon = true } = {}) {
    i = (yeni + manset.length) % manset.length;
    gecen = 0;
    const h = manset[i];
    icerik.innerHTML = String(html`
      <div class="on-saniye__ust"><span>${h.kategori?.ad}</span><time datetime="${h.yayinTarihi}">${zamanOnce(h.yayinTarihi)}</time></div>
      <h2 class="on-saniye__baslik">${h.baslik}</h2>
      <p class="on-saniye__ozet">${h.ozet}</p>`);
    if (animasyon && !hareketAzalt()) {
      icerik.classList.remove('degisti');
      void icerik.offsetWidth;
      icerik.classList.add('degisti');
    }
    git.href = `/haber/${h.slug}`;
    seritler.forEach((s, j) => {
      s.setAttribute('aria-selected', String(j === i));
      s.style.setProperty('--ilerleme', j < i ? 1 : 0);
    });
    ciz();
  }

  function ciz() {
    const oran = Math.min(1, gecen / SURE);
    dolgu.setAttribute('stroke-dashoffset', String(CEVRE * oran));
    sayi.textContent = String(Math.max(0, Math.ceil((SURE - gecen) / 1000)));
    seritler[i]?.style.setProperty('--ilerleme', oran);
  }

  function adim(t) {
    if (son !== null && calisiyor && !duraklatildi && !document.hidden) gecen += t - son;
    son = t;
    if (gecen >= SURE) goster(i + 1);
    else ciz();
    kare = requestAnimationFrame(adim);
  }

  function oynatmaDurumu() {
    oynat.innerHTML = String(calisiyor ? IKON.duraklat : IKON.oynat);
    oynat.setAttribute('aria-label', calisiyor ? 'Duraklat' : 'Oynat');
  }

  panel.addEventListener('pointerenter', () => (duraklatildi = true));
  panel.addEventListener('pointerleave', () => (duraklatildi = false));
  panel.addEventListener('focusin', () => (duraklatildi = true));
  panel.addEventListener('focusout', () => (duraklatildi = false));
  oynat.addEventListener('click', () => {
    calisiyor = !calisiyor;
    oynatmaDurumu();
  });
  for (const b of $$('[data-yon]', panel)) b.addEventListener('click', () => goster(i + Number(b.dataset.yon)));
  for (const s of seritler) s.addEventListener('click', () => goster(Number(s.dataset.i)));
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goster(i + 1);
    if (e.key === 'ArrowLeft') goster(i - 1);
  });

  oynatmaDurumu();
  goster(0, { animasyon: false });
  kare = requestAnimationFrame(adim);
  return () => cancelAnimationFrame(kare);
}

export async function goster(kok) {
  const [manset, liste, populer, sistem] = await Promise.all([
    api.manset(),
    api.haberler({ limit: 9 }),
    api.populer().catch(() => []),
    api.sistem().catch(() => null),
  ]);

  kok.innerHTML = String(html`
    ${manset.manset.length ? panelCiz(manset.manset) : ''}
    <div class="ana-izgara">
      <section aria-labelledby="son-haberler-baslik">
        <div class="bolum-baslik">
          <h2 id="son-haberler-baslik">Son haberler</h2>
          <button class="dugme dugme--ikincil dugme--kucuk" id="yeni-haber" type="button" hidden>Yeni haber var, listeyi yenile</button>
        </div>
        <div class="haber-listesi" id="haber-listesi">
          ${liste.haberler.map((h, i) => haberKarti(h, { onde: i === 0 }))}
        </div>
        ${liste.sayfaSayisi > 1 ? html`<div class="daha-fazla"><button class="dugme dugme--ikincil" id="daha-fazla" type="button">Daha fazla haber</button></div>` : ''}
      </section>
      <aside class="yan">
        <section aria-labelledby="populer-baslik">
          <div class="bolum-baslik"><h2 id="populer-baslik">Bugün en çok okunan</h2></div>
          <ol class="populer">
            ${populer.map((h) => html`<li><a href="/haber/${h.slug}">${h.baslik}</a><small>${h.kategori?.ad}</small></li>`)}
          </ol>
        </section>
        <section class="sor-kutu">
          <h2>Haberlere sor</h2>
          <p>Arşivdeki haberlere dayanarak yanıt veren yapay zekâ asistanı. Kaynaklarını da gösterir.</p>
          <form class="satir" id="hizli-sor" action="/asistan">
            <label class="gorunmez" for="hizli-soru">Sorunuz</label>
            <input class="girdi" id="hizli-soru" name="s" placeholder="Örneğin: kampüste bu hafta neler var?" required minlength="3" />
            <button class="dugme dugme--kobalt" type="submit">Sor</button>
          </form>
        </section>
      </aside>
    </div>
    ${sistem
      ? html`<section class="nasil" aria-labelledby="nasil-baslik">
          <div>
            <h2 id="nasil-baslik">Bu site nasıl çalışıyor?</h2>
            <p>haber10da'nın her parçası backend yol haritasındaki bir konuyu öğretmek için yazıldı. Bileşenlerin şu anki durumu yanda; ayrıntılar, canlı deneyler ve haftalık ders planı ders sayfasında.</p>
            <a class="dugme" href="/ders">Ders sayfasına git</a>
          </div>
          ${bilesenIzgarasi(sistem)}
        </section>`
      : ''}`);

  const temizlikler = [];
  if (manset.manset.length) temizlikler.push(onSaniyeKur(kok, manset.manset));

  // Sayfalama
  let sayfa = 1;
  $('#daha-fazla', kok)?.addEventListener('click', async (e) => {
    const dugme = e.currentTarget;
    dugme.disabled = true;
    const sonraki = await api.haberler({ limit: 9, sayfa: ++sayfa });
    const kap = document.createElement('div');
    kap.innerHTML = String(html`${sonraki.haberler.map((h) => haberKarti(h))}`);
    renkleriUygula(kap);
    $('#haber-listesi', kok).append(...kap.children);
    dugme.disabled = false;
    if (sayfa >= sonraki.sayfaSayisi) dugme.parentElement.remove();
  });

  $('#hizli-sor', kok).addEventListener('submit', (e) => {
    e.preventDefault();
    const s = $('#hizli-soru', kok).value.trim();
    history.pushState(null, '', `/asistan?s=${encodeURIComponent(s)}`);
    dispatchEvent(new PopStateEvent('popstate'));
  });

  // Canlı: yeni haber yayımlanınca kullanıcıya sor, listeyi kendiliğinden kaydırma
  const yeniDugme = $('#yeni-haber', kok);
  const yeniHaber = () => (yeniDugme.hidden = false);
  canliOlaylar.addEventListener('haber-yayinlandi', yeniHaber);
  yeniDugme.addEventListener('click', async () => {
    const taze = await api.haberler({ limit: 9 });
    $('#haber-listesi', kok).innerHTML = String(html`${taze.haberler.map((h, i) => haberKarti(h, { onde: i === 0 }))}`);
    renkleriUygula($('#haber-listesi', kok));
    yeniDugme.hidden = true;
  });
  temizlikler.push(() => canliOlaylar.removeEventListener('haber-yayinlandi', yeniHaber));

  document.title = 'haber10da — gündem 10 saniyede';
  return () => temizlikler.forEach((fn) => fn());
}
