// WebSocket — "şu an bu haberi N kişi okuyor".
// SSE'den farkı: çift yönlü. İstemci hangi haberi okuduğunu bildirir, sunucu oda sayısını yayınlar.
//
//   istemci → {"tur":"katil","oda":"haber-slug"}
//   sunucu  → {"tur":"okur","oda":"haber-slug","sayi":3}
//   sunucu  → {"tur":"site","sayi":42}   (sitedeki toplam bağlantı)
//
// Not: Sayılar bu sunucu sürecine aittir. Birden çok sunucuda doğru sayım için
// odalar Redis'te (ör. HINCRBY) tutulmalıdır — öğrenci ödevi olarak bırakıldı.
import { WebSocketServer } from 'ws';
import { canliBaglanti } from '../lib/metrikler.js';
import { logger } from '../lib/logger.js';

const odalar = new Map(); // oda → Set<ws>
let wss;

function gonder(ws, veri) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(veri));
}

function odaYayini(oda) {
  const uyeler = odalar.get(oda);
  if (!uyeler) return;
  for (const ws of uyeler) gonder(ws, { tur: 'okur', oda, sayi: uyeler.size });
}

function siteYayini() {
  for (const ws of wss.clients) gonder(ws, { tur: 'site', sayi: wss.clients.size });
  canliBaglanti.set({ tur: 'websocket' }, wss.clients.size);
}

function odadanCik(ws) {
  if (!ws.oda) return;
  const uyeler = odalar.get(ws.oda);
  uyeler?.delete(ws);
  if (uyeler?.size === 0) odalar.delete(ws.oda);
  else odaYayini(ws.oda);
  ws.oda = null;
}

export function wsBaslat(sunucu) {
  wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });

  sunucu.on('upgrade', (req, soket, bas) => {
    if (new URL(req.url, 'http://x').pathname !== '/ws') return soket.destroy();
    wss.handleUpgrade(req, soket, bas, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws) => {
    ws.canli = true;
    ws.on('pong', () => (ws.canli = true));
    ws.on('message', (ham) => {
      let m;
      try {
        m = JSON.parse(ham.toString());
      } catch {
        return;
      }
      if (m.tur === 'katil' && typeof m.oda === 'string' && m.oda.length < 120) {
        odadanCik(ws);
        ws.oda = m.oda;
        if (!odalar.has(m.oda)) odalar.set(m.oda, new Set());
        odalar.get(m.oda).add(ws);
        odaYayini(m.oda);
      } else if (m.tur === 'ayril') {
        odadanCik(ws);
      }
    });
    ws.on('close', () => {
      odadanCik(ws);
      siteYayini();
    });
    ws.on('error', (err) => logger.debug({ err: err.message }, 'WebSocket hatası'));
    siteYayini();
  });

  // Ölü bağlantı temizliği: 30 sn'de bir ping, pong gelmeyeni kapat
  const nabiz = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.canli) {
        ws.terminate();
        continue;
      }
      ws.canli = false;
      ws.ping();
    }
  }, 30_000);
  wss.on('close', () => clearInterval(nabiz));
  return wss;
}

export function wsKapat() {
  if (!wss) return;
  for (const ws of wss.clients) ws.close(1001, 'Sunucu kapanıyor');
  wss.close();
}

export const wsIstemciSayisi = () => wss?.clients.size ?? 0;
