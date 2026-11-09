// Yardımcılar. En önemlisi html`` etiketli şablonu: içine konan her değer otomatik kaçışlanır.
// Böylece bir haber başlığında <script> olsa bile metin olarak görünür, çalışmaz (XSS koruması).
// Bilinçli olarak HTML eklemek gerekirse guvenli() ile sarılır.

class Guvenli {
  constructor(s) {
    this.s = s;
  }
  toString() {
    return this.s;
  }
}
export const guvenli = (s) => new Guvenli(s);

const KACIS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const kacis = (s) => String(s).replace(/[&<>"']/g, (c) => KACIS[c]);

function deger(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Guvenli) return v.s;
  if (Array.isArray(v)) return v.map(deger).join('');
  return kacis(v);
}

export function html(parcalar, ...degerler) {
  let sonuc = '';
  parcalar.forEach((p, i) => {
    sonuc += p + (i < degerler.length ? deger(degerler[i]) : '');
  });
  return guvenli(sonuc);
}

export const $ = (s, kok = document) => kok.querySelector(s);
export const $$ = (s, kok = document) => [...kok.querySelectorAll(s)];

const goreli = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });
export function zamanOnce(tarih) {
  const fark = (new Date(tarih) - Date.now()) / 1000;
  const mutlak = Math.abs(fark);
  if (mutlak < 60) return 'az önce';
  if (mutlak < 3600) return goreli.format(Math.round(fark / 60), 'minute');
  if (mutlak < 86400) return goreli.format(Math.round(fark / 3600), 'hour');
  if (mutlak < 604800) return goreli.format(Math.round(fark / 86400), 'day');
  return tamTarih(tarih);
}
export const tamTarih = (t) =>
  new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
export const saatTarih = (t) =>
  new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export function okumaMetni(sn) {
  if (sn < 60) return `${sn} sn okuma`;
  return `${Math.round(sn / 60)} dk okuma`;
}

export const kelimeSay = (s = '') => (s.match(/[\p{L}\p{N}]+/gu) ?? []).length;

export function basHarfler(ad = '') {
  return ad
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toLocaleUpperCase('tr-TR'))
    .join('');
}

// Arama vurgusu: sunucu ⟦ ⟧ işaretleri döner. Önce tüm metni kaçışla, sonra işaretleri <mark> yap.
export const vurgula = (s = '') => guvenli(kacis(s).replace(/⟦/g, '<mark>').replace(/⟧/g, '</mark>'));

export function bildir(mesaj) {
  document.querySelector('.bildirim')?.remove();
  const el = document.createElement('div');
  el.className = 'bildirim';
  el.setAttribute('role', 'status');
  el.textContent = mesaj;
  document.body.append(el);
  setTimeout(() => el.remove(), 3800);
}

export const hareketAzalt = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const IKON = {
  on: guvenli(
    '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="2"/><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="40.8" stroke-dashoffset="10" stroke-linecap="round" transform="rotate(-90 8 8)"/></svg>',
  ),
  oynat: guvenli('<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>'),
  duraklat: guvenli('<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>'),
  onceki: guvenli('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>'),
  sonraki: guvenli('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'),
  gunes: guvenli('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'),
  ay: guvenli('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/></svg>'),
  github: guvenli('<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C17.3 4.8 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"/></svg>'),
};
