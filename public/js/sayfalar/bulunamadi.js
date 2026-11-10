import { html } from '../yardimci.js';

export function goster(kok) {
  kok.innerHTML = String(html`
    <div class="bos">
      <h2>Bu sayfa yok</h2>
      <p>Bağlantı hatalı olabilir ya da haber kaldırılmış olabilir.</p>
      <p class="satir"><a class="dugme" href="/">Anasayfaya dön</a><a class="dugme dugme--ikincil" href="/arama">Haber ara</a></p>
    </div>`);
  document.title = 'Sayfa bulunamadı — haber10da';
}
