// Uygulama girişi: tema, oturum, kategoriler, canlı akış, yönlendirici.
import { api, oturum, yenile } from './api.js';
import { rota, baslat, git } from './yonlendirici.js';
import { sseBaslat, wsBaslat, canliOlaylar } from './canli.js';
import { html, $, zamanOnce, IKON, bildir, basHarfler } from './yardimci.js';

// ---- Tema: sistem tercihi + elle seçim (yalnızca bu tarayıcıda hatırlanır)
const temaDugmesi = $('#tema-dugmesi');
function temaUygula(tema) {
  if (tema) document.documentElement.dataset.theme = tema;
  else delete document.documentElement.dataset.theme;
  const koyu = tema ? tema === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  temaDugmesi.innerHTML = String(koyu ? IKON.gunes : IKON.ay);
  temaDugmesi.setAttribute('aria-label', koyu ? 'Açık temaya geç' : 'Koyu temaya geç');
}
let kayitliTema = null;
try {
  kayitliTema = localStorage.getItem('tema');
} catch {
  /* depolama kapalı olabilir */
}
temaUygula(kayitliTema);
temaDugmesi.addEventListener('click', () => {
  const koyu = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const yeni = koyu ? 'light' : 'dark';
  temaUygula(yeni);
  try {
    localStorage.setItem('tema', yeni);
  } catch {
    /* yok say */
  }
});

// ---- Oturum alanı
function oturumCiz(k) {
  const alan = $('#oturum-alani');
  if (!k) {
    alan.innerHTML = String(html`<a class="dugme" href="/giris">Giriş yap</a>`);
    return;
  }
  alan.innerHTML = String(html`
    <span class="satir">
      ${oturum.editorMu ? html`<a class="dugme dugme--ikincil metinli" href="/editor">Editör masası</a>` : ''}
      <button class="dugme-ikon" id="cikis-dugmesi" type="button" title="${k.ad} — çıkış yap" aria-label="Çıkış yap">
        <span class="avatar">${k.avatar ? html`<img src="${k.avatar}" alt="" width="32" height="32" />` : basHarfler(k.ad)}</span>
      </button>
    </span>`);
  $('#cikis-dugmesi').addEventListener('click', async () => {
    await api.cikis();
    bildir('Çıkış yapıldı.');
    if (location.pathname.startsWith('/editor')) git('/');
  });
}
oturum.degisince(oturumCiz);

// ---- Kategori menüsü
async function menuCiz() {
  try {
    const kategoriler = await api.kategoriler();
    $('#kategoriler-nav').innerHTML = String(
      html`${kategoriler.map((k) => html`<a href="/kategori/${k.slug}" data-slug="${k.slug}">${k.ad}</a>`)}`,
    );
    menuIsaretle();
  } catch {
    /* menü olmadan da çalışır */
  }
}
function menuIsaretle() {
  const m = location.pathname.match(/^\/kategori\/([a-z0-9-]+)/);
  for (const a of document.querySelectorAll('#kategoriler-nav a')) {
    if (m && a.dataset.slug === m[1]) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}
document.addEventListener('sayfa-degisti', menuIsaretle);

// ---- Son dakika şeridi (SSE)
function sonDakikaGoster(h, yeni = false) {
  const serit = $('#son-dakika');
  const a = $('#son-dakika-baglanti');
  a.textContent = h.baslik;
  a.href = `/haber/${h.slug}`;
  const z = $('#son-dakika-zaman');
  z.dateTime = h.yayinTarihi;
  z.textContent = zamanOnce(h.yayinTarihi);
  serit.hidden = false;
  if (yeni) {
    serit.classList.remove('yeni');
    void serit.offsetWidth;
    serit.classList.add('yeni');
  }
}
canliOlaylar.addEventListener('son-dakika', (e) => sonDakikaGoster(e.detail, true));
canliOlaylar.addEventListener('ws-site', (e) => {
  $('#site-okur').textContent = `Şu an sitede ${e.detail.sayi} kişi var.`;
});

// ---- Rotalar (her sayfa ayrı modül; ihtiyaç olunca yüklenir)
rota(/^\/$/, () => import('./sayfalar/anasayfa.js'));
rota(/^\/kategori\/(?<slug>[a-z0-9-]+)$/, () => import('./sayfalar/kategori.js'));
rota(/^\/haber\/(?<slug>[a-z0-9-]+)$/, () => import('./sayfalar/haber.js'));
rota(/^\/arama$/, () => import('./sayfalar/arama.js'));
rota(/^\/asistan$/, () => import('./sayfalar/asistan.js'));
rota(/^\/(?<mod>giris|kayit)$/, () => import('./sayfalar/giris.js'));
rota(/^\/editor$/, () => import('./sayfalar/editor.js'));
rota(/^\/editor\/(?<id>yeni|\d+)$/, () => import('./sayfalar/editor-form.js'));
rota(/^\/ders$/, () => import('./sayfalar/ders.js'));
rota(/.*/, () => import('./sayfalar/bulunamadi.js'));

// ---- Başlat
oturumCiz(null);
await yenile(); // httpOnly çerez varsa oturumu sessizce geri getir
menuCiz();
api
  .manset()
  .then((m) => m.sonDakika[0] && sonDakikaGoster(m.sonDakika[0]))
  .catch(() => {});
sseBaslat();
wsBaslat();
baslat();

const q = new URLSearchParams(location.search);
if (q.get('giris') === 'github' && oturum.kullanici) {
  bildir(`Hoş geldiniz, ${oturum.kullanici.ad}.`);
  history.replaceState(null, '', '/');
}
