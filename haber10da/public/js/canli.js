// Canlı bağlantılar:
//   SSE (EventSource)  → son dakika ve yeni haber olayları (sunucu → tarayıcı)
//   WebSocket          → "bu haberi N kişi okuyor" (iki yönlü)
const olaylar = new EventTarget();
export const canliOlaylar = olaylar;

export function sseBaslat() {
  // EventSource bağlantı koparsa kendiliğinden yeniden bağlanır ve Last-Event-ID gönderir.
  const kaynak = new EventSource('/api/canli/akis');
  for (const ad of ['son-dakika', 'haber-yayinlandi', 'haber-guncellendi']) {
    kaynak.addEventListener(ad, (e) => olaylar.dispatchEvent(new CustomEvent(ad, { detail: JSON.parse(e.data) })));
  }
  kaynak.addEventListener('open', () => olaylar.dispatchEvent(new CustomEvent('sse-durum', { detail: 'acik' })));
  kaynak.addEventListener('error', () => olaylar.dispatchEvent(new CustomEvent('sse-durum', { detail: 'koptu' })));
  return kaynak;
}

let ws;
let bekleyenOda = null;
let deneme = 0;

function wsBaglan() {
  const protokol = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${protokol}://${location.host}/ws`);
  ws.addEventListener('open', () => {
    deneme = 0;
    if (bekleyenOda) ws.send(JSON.stringify({ tur: 'katil', oda: bekleyenOda }));
  });
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    olaylar.dispatchEvent(new CustomEvent(`ws-${m.tur}`, { detail: m }));
  });
  ws.addEventListener('close', () => {
    // Üstel geri çekilme: 1, 2, 4, 8... sn (en fazla 30) sonra tekrar dene
    const bekle = Math.min(30_000, 1000 * 2 ** deneme++);
    setTimeout(wsBaglan, bekle);
  });
}

export function wsBaslat() {
  wsBaglan();
}

export function odayaKatil(oda) {
  bekleyenOda = oda;
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ tur: 'katil', oda }));
}

export function odadanAyril() {
  bekleyenOda = null;
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ tur: 'ayril' }));
}
