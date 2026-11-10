// Sunucu Gönderimli Olaylar (Server-Sent Events) — "son dakika" akışı.
// Tek yönlü (sunucu → tarayıcı), düz HTTP üzerinde, tarayıcıda EventSource ile otomatik yeniden bağlanır.
//
//   HTTP/1.1 200  Content-Type: text/event-stream
//   id: 1731200000000
//   event: son-dakika
//   data: {"baslik":"..."}
//   (boş satır = olay sonu)
//
// Birden çok sunucu varsa: olay Redis PUB/SUB ile tüm sunuculara dağıtılır, her biri kendi istemcilerine yazar.
// Yeniden bağlanan tarayıcı Last-Event-ID gönderir; kaçırdığı olaylar tampondan tekrar gönderilir.
import { onbellek } from '../onbellek/index.js';
import { canliBaglanti } from '../lib/metrikler.js';

const KANAL = 'haber10da:olaylar';
const istemciler = new Set();
const tampon = []; // son 50 olay
let sonId = 0;

function yaz(res, { id, olay, veri }) {
  res.write(`id: ${id}\nevent: ${olay}\ndata: ${JSON.stringify(veri)}\n\n`);
}

export async function sseBaslat() {
  await onbellek.abone(KANAL, (m) => {
    tampon.push(m);
    if (tampon.length > 50) tampon.shift();
    for (const res of istemciler) yaz(res, m);
  });
}

export async function olayYayinla(olay, veri) {
  sonId = Math.max(Date.now(), sonId + 1);
  await onbellek.yayinla(KANAL, { id: sonId, olay, veri });
}

export function sseIsleyici(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Nginx tamponlamasın, olay anında gitsin
  });
  res.write('retry: 5000\n\n');

  const son = Number(req.get('last-event-id') ?? 0);
  if (son) for (const m of tampon.filter((t) => t.id > son)) yaz(res, m);

  istemciler.add(res);
  canliBaglanti.set({ tur: 'sse' }, istemciler.size);

  // Kalp atışı: boşta bağlantıları kesen vekillere karşı 25 sn'de bir yorum satırı
  const kalp = setInterval(() => res.write(`: kalp ${Date.now()}\n\n`), 25_000);
  req.on('close', () => {
    clearInterval(kalp);
    istemciler.delete(res);
    canliBaglanti.set({ tur: 'sse' }, istemciler.size);
  });
}

export function sseKapat() {
  for (const res of istemciler) res.end();
  istemciler.clear();
}

export const sseIstemciSayisi = () => istemciler.size;
