// Haber yazma/düzenleme formu + yapay zekâ ile 10 saniyelik özet önizleme.
import { api, oturum } from '../api.js';
import { html, $, kelimeSay, bildir, guvenli } from '../yardimci.js';
import { git } from '../yonlendirici.js';

const OZET_SINIR = 35;

export async function goster(kok, { id }) {
  if (!oturum.editorMu) return git('/giris', { degistir: true });
  const yeni = id === 'yeni';
  const [kategoriler, h] = await Promise.all([api.kategoriler(), yeni ? null : api.editor.getir(id)]);
  let ozetKaynak = h?.ozetKaynak ?? null;

  kok.innerHTML = String(html`
    <div class="dar">
      <header class="sayfa-baslik">
        <h1>${yeni ? 'Yeni haber' : 'Haberi düzenle'}</h1>
        <p>${h?.durum === 'yayinda' ? 'Bu haber yayında. Kaydettiğiniz değişiklikler önbellek temizlenerek hemen yansır.' : 'Taslak olarak kaydedilir; yayımlayana kadar okurlar göremez.'}</p>
      </header>
      <form class="kart" id="form" novalidate>
        <div id="ileti"></div>
        <div class="alan"><label for="baslik">Başlık</label><input class="girdi" id="baslik" name="baslik" required minlength="10" maxlength="160" value="${h?.baslik ?? ''}" /></div>
        <div class="alan"><label for="spot">Spot</label><textarea class="girdi girdi--serif" id="spot" name="spot" rows="2" required minlength="20" maxlength="320">${h?.spot ?? ''}</textarea><small>Başlığın altındaki bir iki cümlelik giriş.</small></div>
        <div class="alan"><label for="haber-metni">Haber metni</label><textarea class="girdi girdi--serif" id="haber-metni" name="icerik" rows="12" required minlength="50">${h?.icerik ?? ''}</textarea><small>Paragrafları boş satırla ayırın.</small></div>
        <div class="iki-alan">
          <div class="alan">
            <label for="kategoriId">Kategori</label>
            <select class="girdi" id="kategoriId" name="kategoriId">
              ${kategoriler.map((k) => html`<option value="${k.id}" ${isaret(h?.kategori?.id === k.id)}>${k.ad}</option>`)}
            </select>
          </div>
          <div class="alan">
            <label for="etiketler">Etiketler</label>
            <input class="girdi" id="etiketler" name="etiketler" value="${(h?.etiketler ?? []).join(', ')}" placeholder="virgülle ayırın" />
          </div>
        </div>
        <div class="alan">
          <div class="satir"><label for="ozet">10 saniyelik özet</label><span class="kelime-sayaci" id="sayac"></span></div>
          <textarea class="girdi girdi--serif" id="ozet" name="ozet" rows="3" maxlength="400" placeholder="Boş bırakırsanız yayımlanınca otomatik üretilir">${h?.ozet ?? ''}</textarea>
          <div class="satir"><button class="dugme dugme--ikincil dugme--kucuk" type="button" id="ozetle">Özeti yapay zekâyla üret</button><small id="ozet-not"></small></div>
        </div>
        <label class="secim"><input type="checkbox" id="sonDakika" name="sonDakika" ${isaret(h?.sonDakika, 'checked')} /> Son dakika olarak işaretle</label>
        <div class="satir">
          <button class="dugme dugme--ikincil" type="submit" data-sonra="kaydet">Kaydet</button>
          <button class="dugme dugme--kobalt" type="submit" data-sonra="yayinla">${h?.durum === 'yayinda' ? 'Kaydet ve yayında tut' : 'Kaydet ve yayımla'}</button>
          <a class="dugme dugme--ikincil" href="/editor">Vazgeç</a>
        </div>
      </form>
    </div>`);

  const form = $('#form', kok);
  const ozet = $('#ozet', kok);
  const sayac = $('#sayac', kok);
  const sayacGuncelle = () => {
    const n = kelimeSay(ozet.value);
    sayac.textContent = `${n} / ${OZET_SINIR} kelime`;
    sayac.classList.toggle('asim', n > OZET_SINIR);
  };
  ozet.addEventListener('input', () => {
    ozetKaynak = 'editor';
    sayacGuncelle();
  });
  sayacGuncelle();

  const veriTopla = () => {
    const v = Object.fromEntries(new FormData(form));
    return {
      baslik: v.baslik,
      spot: v.spot,
      icerik: v.icerik,
      kategoriId: Number(v.kategoriId),
      sonDakika: $('#sonDakika', kok).checked,
      ozet: v.ozet.trim() || null,
      ozetKaynak: v.ozet.trim() ? (ozetKaynak ?? 'editor') : undefined,
      etiketler: v.etiketler.split(',').map((s) => s.trim()).filter((s) => s.length >= 2).slice(0, 6),
    };
  };

  const hataGoster = (err) => {
    const alanlar = err.govde?.alanlar ?? [];
    $('#ileti', kok).innerHTML = String(
      html`<p class="ileti ileti--hata">${alanlar.length ? alanlar.map((a) => `${a.alan}: ${a.mesaj}`).join(' ') : err.message}</p>`,
    );
    $('#ileti', kok).scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  $('#ozetle', kok).addEventListener('click', async (e) => {
    const b = e.currentTarget;
    const v = veriTopla();
    b.disabled = true;
    $('#ozet-not', kok).textContent = 'Özet hazırlanıyor…';
    try {
      const sonuc = await api.editor.ozetle({ baslik: v.baslik, spot: v.spot, icerik: v.icerik });
      ozet.value = sonuc.ozet;
      ozetKaynak = sonuc.kaynak;
      if (!$('#etiketler', kok).value.trim()) $('#etiketler', kok).value = sonuc.etiketler.join(', ');
      $('#ozet-not', kok).textContent =
        sonuc.kaynak === 'yz' ? 'Yapay zekâ önerisi. Okuyup düzeltin.' : 'Dil modeli bağlı değil; metnin ilk cümlelerinden çıkarıldı.';
      sayacGuncelle();
    } catch (err) {
      $('#ozet-not', kok).textContent = '';
      hataGoster(err);
    } finally {
      b.disabled = false;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sonra = e.submitter?.dataset.sonra ?? 'kaydet';
    for (const b of form.querySelectorAll('button')) b.disabled = true;
    try {
      const kayit = yeni ? await api.editor.olustur(veriTopla()) : await api.editor.guncelle(id, veriTopla());
      if (sonra === 'yayinla' && kayit.durum !== 'yayinda') await api.editor.yayinla(kayit.id);
      bildir(sonra === 'yayinla' ? 'Haber yayımlandı.' : 'Değişiklikler kaydedildi.');
      git('/editor');
    } catch (err) {
      hataGoster(err);
      for (const b of form.querySelectorAll('button')) b.disabled = false;
    }
  });
  document.title = `${yeni ? 'Yeni haber' : 'Düzenle'} — haber10da`;
}

// Boolean öznitelikler (selected, checked) kaçışlanmadan eklenmeli
function isaret(kosul, ad = 'selected') {
  return kosul ? guvenli(ad) : '';
}
