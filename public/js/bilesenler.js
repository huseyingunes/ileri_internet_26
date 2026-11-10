// Tekrar kullanılan arayüz parçaları.
import { html, zamanOnce, okumaMetni, IKON } from './yardimci.js';

export function haberKarti(h, { onde = false } = {}) {
  return html`
    <article class="haber ${onde ? 'haber--onde' : ''}">
      ${h.kategori
        ? html`<a class="haber__kategori" href="/kategori/${h.kategori.slug}" data-renk="${h.kategori.renk}">${h.kategori.ad}</a>`
        : ''}
      <h3 class="haber__baslik"><a href="/haber/${h.slug}">${h.baslik}</a></h3>
      <p class="haber__spot">${h.spot}</p>
      <div class="meta">
        <time datetime="${h.yayinTarihi}">${zamanOnce(h.yayinTarihi)}</time>
        ${h.ozet ? html`<span class="meta__on">${IKON.on}10 sn özet</span>` : html`<span>${okumaMetni(h.okumaSuresi)}</span>`}
        ${h.ornek ? html`<span class="etiket-ornek">Örnek içerik</span>` : ''}
      </div>
    </article>`;
}

export function iskeletListe(adet = 4) {
  return html`${Array.from({ length: adet }, () => html`<div class="iskelet iskelet--satir"></div>`)}`;
}

export function durumSinifi(durum, yedekMi) {
  if (durum === 'hata') return 'durum-nokta durum-nokta--hata';
  return yedekMi ? 'durum-nokta durum-nokta--yedek' : 'durum-nokta';
}

// Bileşen durumu → okunabilir satırlar (anasayfa tanıtımı ve ders sayfası ortak kullanır)
export function bilesenSatirlari(d) {
  const b = d.bilesenler;
  return [
    { ad: 'Veritabanı', deger: b.veritabani.tur === 'pglite' ? 'PGlite (gömülü)' : 'PostgreSQL', yedek: b.veritabani.tur === 'pglite', durum: b.veritabani.durum },
    { ad: 'Önbellek', deger: b.onbellek.tur === 'redis' ? 'Redis' : 'Bellek içi yedek', yedek: b.onbellek.tur !== 'redis', durum: b.onbellek.durum },
    { ad: 'Mesaj kuyruğu', deger: b.kuyruk.tur === 'rabbitmq' ? 'RabbitMQ' : 'Süreç içi kuyruk', yedek: b.kuyruk.tur !== 'rabbitmq' },
    { ad: 'Arama motoru', deger: b.arama.motor === 'elasticsearch' ? 'Elasticsearch' : 'PostgreSQL tam metin' },
    { ad: 'Dil modeli', deger: b.llm.acik ? `${b.llm.model}${b.llm.devre === 'ACIK' ? ' (devre açık)' : ''}` : 'Bağlı değil, çıkarımsal özet', yedek: !b.llm.acik || b.llm.devre !== 'KAPALI' },
    { ad: 'Gömme modeli', deger: b.gomme.model, yedek: b.gomme.model.startsWith('yerel') },
    { ad: 'Canlı bağlantı', deger: `${b.canli.sse} SSE, ${b.canli.websocket} WebSocket` },
    { ad: 'GitHub ile giriş', deger: b.oauth.github ? 'Açık' : 'Yapılandırılmamış', yedek: !b.oauth.github },
  ];
}

export function bilesenIzgarasi(d) {
  return html`<dl class="bilesen-izgara">
    ${bilesenSatirlari(d).map(
      (s) => html`<div class="bilesen"><dt><span class="${durumSinifi(s.durum, s.yedek)}"></span>${s.ad}</dt><dd title="${s.deger}">${s.deger}</dd></div>`,
    )}
  </dl>`;
}
