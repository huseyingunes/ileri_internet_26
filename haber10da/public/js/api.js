// API istemcisi.
// Erişim belirteci yalnızca bellekte (değişkende) tutulur — localStorage'a yazılmaz, XSS ile çalınamaz.
// Sayfa yenilenince httpOnly yenileme çereziyle /api/auth/yenile çağrılır ve yeni belirteç alınır.

let erisim = null;
let kullanici = null;
const dinleyiciler = new Set();

export const oturum = {
  get kullanici() {
    return kullanici;
  },
  get editorMu() {
    return kullanici && ['editor', 'admin'].includes(kullanici.rol);
  },
  degisince(fn) {
    dinleyiciler.add(fn);
    return () => dinleyiciler.delete(fn);
  },
};

function oturumAyarla(veri) {
  erisim = veri?.erisim ?? null;
  kullanici = veri?.kullanici ?? null;
  for (const fn of dinleyiciler) fn(kullanici);
}

export class ApiHatasi extends Error {
  constructor(durum, govde) {
    super(govde?.detail ?? govde?.title ?? `İstek başarısız (${durum})`);
    this.durum = durum;
    this.govde = govde;
  }
}

// Aynı anda birden çok istek 401 alırsa hepsi TEK yenileme isteğini bekler.
// Yoksa ikinci yenileme, kullanılmış belirteci tekrar gönderir ve sunucu oturumu
// "çalınmış" sayıp iptal eder (yeniden kullanım tespiti).
let yenilemeSozu = null;
export function yenile() {
  yenilemeSozu ??= fetch('/api/auth/yenile', { method: 'POST', credentials: 'same-origin' })
    .then(async (r) => {
      if (!r.ok || r.status === 204) {
        oturumAyarla(null);
        return false;
      }
      oturumAyarla(await r.json());
      return true;
    })
    .catch(() => false)
    .finally(() => {
      yenilemeSozu = null;
    });
  return yenilemeSozu;
}

export async function istek(yol, { yontem = 'GET', govde, basliklar = {}, tekrar = true, ham = false } = {}) {
  const ayar = { method: yontem, headers: { ...basliklar }, credentials: 'same-origin' };
  if (govde !== undefined) {
    ayar.headers['content-type'] = 'application/json';
    ayar.body = JSON.stringify(govde);
  }
  if (erisim) ayar.headers.authorization = `Bearer ${erisim}`;

  const yanit = await fetch(yol, ayar);
  if (yanit.status === 401 && erisim && tekrar) {
    if (await yenile()) return istek(yol, { yontem, govde, basliklar, tekrar: false, ham });
  }
  if (ham) return yanit;
  if (yanit.status === 204) return null;
  const tur = yanit.headers.get('content-type') ?? '';
  const veri = tur.includes('json') ? await yanit.json() : await yanit.text();
  if (!yanit.ok) throw new ApiHatasi(yanit.status, veri);
  return veri;
}

export const api = {
  kategoriler: () => istek('/api/kategoriler'),
  haberler: (q = {}) => istek(`/api/haberler?${new URLSearchParams(q)}`),
  manset: () => istek('/api/haberler/manset'),
  populer: () => istek('/api/haberler/populer'),
  haber: (slug) => istek(`/api/haberler/${encodeURIComponent(slug)}`),
  benzer: (slug) => istek(`/api/haberler/${encodeURIComponent(slug)}/benzer`),
  ara: (q, sayfa = 1) => istek(`/api/arama?${new URLSearchParams({ q, sayfa })}`),
  sistem: () => istek('/api/sistem/durum'),
  saglayicilar: () => istek('/api/auth/saglayicilar'),

  async giris(eposta, parola) {
    oturumAyarla(await istek('/api/auth/giris', { yontem: 'POST', govde: { eposta, parola } }));
  },
  async kayit(ad, eposta, parola) {
    oturumAyarla(await istek('/api/auth/kayit', { yontem: 'POST', govde: { ad, eposta, parola } }));
  },
  async cikis() {
    await istek('/api/auth/cikis', { yontem: 'POST' }).catch(() => {});
    oturumAyarla(null);
  },

  editor: {
    liste: () => istek('/api/editor/haberler'),
    getir: (id) => istek(`/api/editor/haberler/${id}`),
    olustur: (veri) => istek('/api/editor/haberler', { yontem: 'POST', govde: veri }),
    guncelle: (id, veri) => istek(`/api/editor/haberler/${id}`, { yontem: 'PATCH', govde: veri }),
    yayinla: (id) => istek(`/api/editor/haberler/${id}/yayinla`, { yontem: 'POST' }),
    geriAl: (id) => istek(`/api/editor/haberler/${id}/geri-al`, { yontem: 'POST' }),
    sil: (id) => istek(`/api/editor/haberler/${id}`, { yontem: 'DELETE' }),
    ozetle: (veri) => istek('/api/editor/ozet-onizle', { yontem: 'POST', govde: veri }),
  },
};

// POST yanıtını akış olarak oku (text/event-stream). EventSource yalnızca GET desteklediği için
// fetch + ReadableStream ile olayları kendimiz ayrıştırıyoruz.
export async function akisliIstek(yol, govde, olayIsleyici, sinyal) {
  const yanit = await fetch(yol, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(erisim ? { authorization: `Bearer ${erisim}` } : {}) },
    body: JSON.stringify(govde),
    signal: sinyal,
  });
  if (!yanit.ok) {
    const veri = await yanit.json().catch(() => ({}));
    throw new ApiHatasi(yanit.status, veri);
  }
  const okuyucu = yanit.body.pipeThrough(new TextDecoderStream()).getReader();
  let tampon = '';
  for (;;) {
    const { value, done } = await okuyucu.read();
    if (done) break;
    tampon += value;
    let sinir;
    while ((sinir = tampon.indexOf('\n\n')) >= 0) {
      const blok = tampon.slice(0, sinir);
      tampon = tampon.slice(sinir + 2);
      let olay = 'message';
      let veri = '';
      for (const satir of blok.split('\n')) {
        if (satir.startsWith('event:')) olay = satir.slice(6).trim();
        else if (satir.startsWith('data:')) veri += satir.slice(5).trim();
      }
      if (veri) olayIsleyici(olay, JSON.parse(veri));
    }
  }
}
