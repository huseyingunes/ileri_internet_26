// RSS / Atom okuma — RSS toplayıcı ve günlük haber ajanı ortak kullanır.
import { XMLParser } from 'fast-xml-parser';
import { htmlTemizle } from './metin.js';

const cozumleyici = new XMLParser({ ignoreAttributes: false, processEntities: true, htmlEntities: true });

const sayisalVarliklar = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

const metin = (v) => htmlTemizle(sayisalVarliklar(String(v?.['#text'] ?? v ?? '')));

function baglantiBul(o) {
  if (typeof o.link === 'string') return o.link.trim();
  const liste = Array.isArray(o.link) ? o.link : [o.link];
  const alt = liste.find((l) => l?.['@_rel'] === 'alternate' || !l?.['@_rel']) ?? liste[0];
  return alt?.['@_href'] ?? alt?.['#text'] ?? (typeof o.guid === 'string' ? o.guid : o.guid?.['#text']);
}

export function rssCoz(xml) {
  const veri = cozumleyici.parse(xml);
  const ogeler = veri?.rss?.channel?.item ?? veri?.feed?.entry ?? veri?.['rdf:RDF']?.item ?? [];
  return (Array.isArray(ogeler) ? ogeler : [ogeler]).map((o) => {
    const tarih = new Date(o.pubDate ?? o.updated ?? o.published ?? o['dc:date'] ?? Date.now());
    return {
      baslik: metin(o.title),
      baglanti: baglantiBul(o),
      aciklama: metin(o.description ?? o.summary ?? o.content ?? ''),
      tarih: Number.isNaN(tarih.getTime()) ? new Date() : tarih,
    };
  });
}

// Bazı Türkçe kaynaklar hâlâ windows-1254 / iso-8859-9 kullanıyor: karakter kümesini başlıktan
// ya da XML bildiriminden okuyup doğru çöz (Response.text() her zaman UTF-8 varsayar).
export async function rssGetir(url, { zamanAsimiMs = 15_000 } = {}) {
  const yanit = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; haber10da/1.0; +https://haber10da.net)', accept: 'application/rss+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(zamanAsimiMs),
  });
  if (!yanit.ok) throw new Error(`${url} → HTTP ${yanit.status}`);
  const ham = new Uint8Array(await yanit.arrayBuffer());
  const bas = new TextDecoder('latin1').decode(ham.slice(0, 200));
  const kume =
    yanit.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1] ?? bas.match(/encoding=["']([\w-]+)["']/i)?.[1] ?? 'utf-8';
  let xml;
  try {
    xml = new TextDecoder(kume.toLowerCase()).decode(ham);
  } catch {
    xml = new TextDecoder('utf-8').decode(ham);
  }
  return rssCoz(xml);
}
