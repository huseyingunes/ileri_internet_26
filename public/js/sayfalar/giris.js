import { api, oturum } from '../api.js';
import { html, $, IKON, bildir } from '../yardimci.js';
import { git } from '../yonlendirici.js';

export async function goster(kok, { mod }, sorgu) {
  if (oturum.kullanici) return git(oturum.editorMu ? '/editor' : '/', { degistir: true });
  const kayit = mod === 'kayit';
  const saglayicilar = await api.saglayicilar().catch(() => ({ github: false }));
  const githubHata = sorgu.get('hata') === 'github';

  kok.innerHTML = String(html`
    <div class="giris-kap">
      <header class="sayfa-baslik">
        <h1>${kayit ? 'Hesap oluştur' : 'Giriş yap'}</h1>
        <p>${kayit ? 'Okur hesabıyla sorularınızı ve okuma geçmişinizi saklayabilirsiniz.' : 'Editörler haber yazmak ve yayımlamak için giriş yapar.'}</p>
      </header>
      <div class="kart">
        <div id="ileti">${githubHata ? html`<p class="ileti ileti--hata">GitHub ile giriş tamamlanamadı. Tekrar deneyin.</p>` : ''}</div>
        <form id="form" novalidate>
          ${kayit
            ? html`<div class="alan"><label for="ad">Ad soyad</label><input class="girdi" id="ad" name="ad" autocomplete="name" required minlength="2" /></div>`
            : ''}
          <div class="alan"><label for="eposta">E-posta</label><input class="girdi" id="eposta" name="eposta" type="email" autocomplete="email" required /></div>
          <div class="alan">
            <label for="parola">Parola</label>
            <input class="girdi" id="parola" name="parola" type="password" autocomplete="${kayit ? 'new-password' : 'current-password'}" required minlength="${kayit ? 8 : 1}" />
            ${kayit ? html`<small>En az 8 karakter.</small>` : ''}
          </div>
          <button class="dugme dugme--kobalt" type="submit" id="gonder">${kayit ? 'Hesap oluştur' : 'Giriş yap'}</button>
        </form>
        ${saglayicilar.github
          ? html`<div class="ayrac">ya da</div><a class="dugme dugme--ikincil" href="/api/auth/github" data-dis>${IKON.github} GitHub ile devam et</a>`
          : ''}
        <p class="ipucu">
          ${kayit ? html`Hesabınız var mı? <a class="cip" href="/giris">Giriş yap</a>` : html`Hesabınız yok mu? <a class="cip" href="/kayit">Hesap oluştur</a>`}
        </p>
        ${!kayit && location.hostname === 'localhost'
          ? html`<p class="ipucu">Geliştirme hesabı: <code>editor@haber10da.net</code> / <code>editor1234</code></p>`
          : ''}
      </div>
    </div>`);

  const form = $('#form', kok);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    const dugme = $('#gonder', kok);
    dugme.disabled = true;
    $('#ileti', kok).innerHTML = '';
    try {
      if (kayit) await api.kayit(v.ad, v.eposta, v.parola);
      else await api.giris(v.eposta, v.parola);
      bildir(`Hoş geldiniz, ${oturum.kullanici.ad}.`);
      git(oturum.editorMu ? '/editor' : '/');
    } catch (err) {
      const alanlar = err.govde?.alanlar?.map((a) => a.mesaj) ?? [];
      $('#ileti', kok).innerHTML = String(html`<p class="ileti ileti--hata">${alanlar.length ? alanlar.join(' ') : err.message}</p>`);
      dugme.disabled = false;
    }
  });
  document.title = `${kayit ? 'Hesap oluştur' : 'Giriş yap'} — haber10da`;
}
