// Haberlere sor: yanıt parça parça akar; kullanılan araçlar ve kaynaklar ayrıca gösterilir.
import { akisliIstek } from '../api.js';
import { html, $, guvenli, kacis } from '../yardimci.js';

const ORNEKLER = ['Kampüste bu hafta hangi etkinlikler var?', 'Redis neden hızlı?', 'Kimlik avı e-postalarını nasıl anlarım?', 'Final haftasında kütüphane açık mı?'];

// [1] gibi kaynak numaralarını tıklanabilir yap — önce metin kaçışlanır
function kaynakliMetin(metin, kaynaklar) {
  return guvenli(
    kacis(metin).replace(/\[(\d+)\]/g, (m, n) => {
      const k = kaynaklar.find((x) => x.no === Number(n));
      return k ? `<a class="cip" href="/haber/${kacis(k.slug)}">${n}</a>` : m;
    }),
  );
}

export async function goster(kok, _p, sorgu) {
  kok.innerHTML = String(html`
    <div class="asistan">
      <header class="sayfa-baslik">
        <h1>Haberlere sor</h1>
        <p>Asistan yalnızca haber10da arşivindeki haberlere dayanarak yanıt verir ve kullandığı haberleri numarayla gösterir. Arşivde olmayan bilgiyi uydurmaz.</p>
      </header>
      <form class="sor-form" id="sor-form">
        <label class="gorunmez" for="soru">Sorunuz</label>
        <textarea class="girdi" id="soru" rows="2" minlength="3" maxlength="300" required placeholder="Merak ettiğiniz konuyu yazın"></textarea>
        <button class="dugme dugme--kobalt" type="submit" id="sor-dugme">Sor</button>
      </form>
      <div class="ornek-sorular">${ORNEKLER.map((o) => html`<button type="button">${o}</button>`)}</div>
      <section class="yanit" id="yanit" aria-live="polite"></section>
    </div>`);

  const form = $('#sor-form', kok);
  const alan = $('#soru', kok);
  const yanit = $('#yanit', kok);
  const dugme = $('#sor-dugme', kok);
  let denetci;

  async function sor(soru) {
    denetci?.abort();
    denetci = new AbortController();
    dugme.disabled = true;
    let metin = '';
    let kaynaklar = [];
    const araclar = [];
    yanit.innerHTML = String(html`<div class="yanit__metin" id="yanit-metin"><span class="imlec"></span></div>
      <div class="yanit__kaynaklar" id="yanit-kaynak"></div>
      <details class="arac-gunlugu" id="arac-gunlugu" hidden><summary>Asistanın kullandığı araçlar</summary><div></div></details>`);
    const metinEl = $('#yanit-metin', yanit);
    const ciz = (bitti = false) => {
      metinEl.innerHTML = String(html`${kaynakliMetin(metin, kaynaklar)}${bitti ? '' : guvenli('<span class="imlec"></span>')}`);
    };
    try {
      await akisliIstek(
        '/api/asistan/sor',
        { soru },
        (olay, veri) => {
          if (olay === 'parca') {
            metin += veri.metin;
            ciz();
          } else if (olay === 'kaynak') {
            kaynaklar = veri;
            $('#yanit-kaynak', yanit).innerHTML = String(
              html`${kaynaklar.map((k) => html`<div class="kaynak-satir"><b>${k.no}</b><a href="/haber/${k.slug}">${k.baslik}</a></div>`)}`,
            );
          } else if (olay === 'arac') {
            araclar.push(veri);
            const g = $('#arac-gunlugu', yanit);
            g.hidden = false;
            g.lastElementChild.innerHTML = String(
              html`${araclar.map((a) => html`<code>${a.ad}(${JSON.stringify(a.arg)}) → ${a.sonuc} haber</code>`)}`,
            );
          } else if (olay === 'hata') {
            metin += `\n\n${veri.mesaj}`;
          } else if (olay === 'bitti') {
            ciz(true);
          }
        },
        denetci.signal,
      );
      ciz(true);
    } catch (err) {
      if (err.name !== 'AbortError') yanit.innerHTML = String(html`<p class="ileti ileti--hata">${err.message}</p>`);
    } finally {
      dugme.disabled = false;
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const s = alan.value.trim();
    if (s.length >= 3) sor(s);
  });
  alan.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  for (const b of kok.querySelectorAll('.ornek-sorular button')) {
    b.addEventListener('click', () => {
      alan.value = b.textContent;
      form.requestSubmit();
    });
  }

  const ilk = sorgu.get('s');
  if (ilk) {
    alan.value = ilk;
    sor(ilk);
  }
  document.title = 'Haberlere sor — haber10da';
  return () => denetci?.abort();
}
