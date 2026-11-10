// Editör masası: haber listesi, yayımlama, geri alma, silme.
import { api, oturum } from '../api.js';
import { html, zamanOnce, bildir } from '../yardimci.js';
import { git, ciz } from '../yonlendirici.js';

export async function goster(kok) {
  if (!oturum.kullanici) return git('/giris', { degistir: true });
  if (!oturum.editorMu) {
    kok.innerHTML = String(html`<div class="bos"><h2>Editör yetkisi gerekiyor</h2><p>Hesabınız okur rolünde. Editörlük için yöneticiye başvurun.</p></div>`);
    return;
  }
  const liste = await api.editor.liste();

  kok.innerHTML = String(html`
    <header class="sayfa-baslik sayfa-baslik--eylemli">
      <div>
        <h1>Editör masası</h1>
        <p>${oturum.kullanici.rol === 'admin' ? 'Tüm haberler' : 'Yazdığınız haberler'}: ${liste.length}. Yayımladığınız haber anında son dakika akışına düşer; özet ve gömme arka planda üretilir.</p>
      </div>
      <a class="dugme dugme--kobalt" href="/editor/yeni">Yeni haber</a>
    </header>
    ${liste.length
      ? html`<div class="tablo-kap"><table class="tablo">
          <thead><tr><th>Başlık</th><th>Durum</th><th>Kategori</th><th>Güncelleme</th><th>Okunma</th><th><span class="gorunmez">İşlemler</span></th></tr></thead>
          <tbody>
            ${liste.map(
              (h) => html`<tr>
                <td><a href="/editor/${h.id}">${h.baslik}</a>${h.sonDakika ? html` <span class="rozet rozet--taslak">son dakika</span>` : ''}</td>
                <td><span class="rozet rozet--${h.durum}">${h.durum === 'yayinda' ? 'Yayında' : 'Taslak'}</span></td>
                <td>${h.kategori?.ad}</td>
                <td><time datetime="${h.guncelleme}">${zamanOnce(h.guncelleme)}</time></td>
                <td>${h.goruntulenme}</td>
                <td><div class="satir">
                  ${h.durum === 'yayinda'
                    ? html`<a class="dugme dugme--ikincil dugme--kucuk" href="/haber/${h.slug}">Görüntüle</a>
                        <button class="dugme dugme--ikincil dugme--kucuk" data-islem="geri-al" data-id="${h.id}" type="button">Yayından kaldır</button>`
                    : html`<button class="dugme dugme--kucuk" data-islem="yayinla" data-id="${h.id}" type="button">Yayımla</button>`}
                  <button class="dugme dugme--tehlike dugme--kucuk" data-islem="sil" data-id="${h.id}" type="button">Sil</button>
                </div></td>
              </tr>`,
            )}
          </tbody></table></div>`
      : html`<div class="bos"><h2>Henüz haber yazmadınız</h2><p>İlk haberinizi yazmak için "Yeni haber" düğmesini kullanın.</p></div>`}`);

  kok.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-islem]');
    if (!b) return;
    const id = Number(b.dataset.id);
    b.disabled = true;
    try {
      if (b.dataset.islem === 'yayinla') {
        await api.editor.yayinla(id);
        bildir('Haber yayımlandı.');
      } else if (b.dataset.islem === 'geri-al') {
        await api.editor.geriAl(id);
        bildir('Haber yayından kaldırıldı.');
      } else if (b.dataset.islem === 'sil') {
        const satir = b.closest('tr');
        const baslik = satir.querySelector('a').textContent;
        if (!window.confirm(`"${baslik}" kalıcı olarak silinsin mi?`)) {
          b.disabled = false;
          return;
        }
        await api.editor.sil(id);
        bildir('Haber silindi.');
      }
      ciz();
    } catch (err) {
      bildir(err.message);
      b.disabled = false;
    }
  });
  document.title = 'Editör masası — haber10da';
}
