const $ = s => document.querySelector(s);
const kacis = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROL_ADI = { okuyucu: 'Okuyucu', editor: 'Editör', yonetici: 'Yönetici' };

async function kullaniciyiGoster() {
  const yanit = await fetch('/api/ben');
  if (!yanit.ok) {
    $('#kullanici').innerHTML = '<a href="/giris.html">Giriş yap</a>';
    return;
  }
  const k = await yanit.json();
  $('#kullanici').innerHTML = `
    ${k.foto ? `<img src="${kacis(k.foto)}" alt="" class="avatar">` : ''}
    ${kacis(k.ad)} <em>(${ROL_ADI[k.rol]})</em>
    <button id="cikis" class="baglanti">Çıkış</button>`;
  $('#cikis').onclick = async () => {
    await fetch('/api/oturum/kapat', { method: 'POST' });
    location.reload();
  };
  if (k.rol === 'editor' || k.rol === 'yonetici') $('#haber-formu').hidden = false;
}

async function haberleriGoster() {
  const haberler = await (await fetch('/api/haberler')).json();
  $('#haberler').innerHTML = haberler.length
    ? haberler.map(h => `
        <article>
          <h3>${kacis(h.baslik)}</h3>
          <small>${kacis(h.yazar)} · ${new Date(h.tarih).toLocaleString('tr-TR')}</small>
          <p>${kacis(h.icerik)}</p>
        </article>`).join('')
    : '<p>Henüz haber yok.</p>';
}

$('#haber-formu').onsubmit = async ev => {
  ev.preventDefault();
  const yanit = await fetch('/api/haberler', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baslik: $('#baslik').value, icerik: $('#metin').value }),
  });
  if (!yanit.ok) return alert((await yanit.json()).hata);
  ev.target.reset();
  haberleriGoster();
};

kullaniciyiGoster();
haberleriGoster();
