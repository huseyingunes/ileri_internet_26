// İstemci tarafı yönlendirici (History API). Sunucu tüm sayfa yolları için index.html döner;
// hangi sayfanın çizileceğine burada karar verilir.
import { $$ } from './yardimci.js';

const rotalar = [];
let temizle = null;
let sonYol = null;

export function rota(desen, yukleyici) {
  rotalar.push({ desen, yukleyici });
}

// CSP satır içi style özniteliğini yasaklar; renkler çizimden sonra CSSOM ile atanır.
function renkleriUygula(kok) {
  for (const el of $$('[data-renk]', kok)) el.style.setProperty('--kat', el.dataset.renk);
}

export async function ciz() {
  const kok = document.getElementById('icerik');
  const yol = location.pathname;
  const ayniSayfa = yol === sonYol;
  sonYol = yol;
  if (typeof temizle === 'function') temizle();
  temizle = null;

  for (const { desen, yukleyici } of rotalar) {
    const eslesme = yol.match(desen);
    if (!eslesme) continue;
    const parametreler = eslesme.groups ?? {};
    try {
      const modul = await yukleyici();
      temizle = await modul.goster(kok, parametreler, new URLSearchParams(location.search));
    } catch (err) {
      console.error(err);
      kok.innerHTML = `<div class="bos"><h2>Sayfa yüklenemedi</h2><p>${err.durum === 404 ? 'Aradığınız içerik bulunamadı veya kaldırılmış.' : 'Bağlantınızı kontrol edip sayfayı yenileyin.'}</p><p><a class="dugme" href="/">Anasayfaya dön</a></p></div>`;
    }
    renkleriUygula(kok);
    if (!ayniSayfa) {
      window.scrollTo({ top: 0 });
      kok.focus({ preventScroll: true });
    }
    document.dispatchEvent(new CustomEvent('sayfa-degisti', { detail: { yol } }));
    return;
  }
}

export function git(yol, { degistir = false } = {}) {
  if (degistir) history.replaceState(null, '', yol);
  else history.pushState(null, '', yol);
  ciz();
}

export function baslat() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target || a.hasAttribute('download') || a.hasAttribute('data-dis')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/graphql')) return;
    e.preventDefault();
    if (url.pathname + url.search !== location.pathname + location.search) git(url.pathname + url.search);
  });
  window.addEventListener('popstate', ciz);
  ciz();
}

export { renkleriUygula };
