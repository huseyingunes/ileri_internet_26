// haber10da MCP sunucusu — Model Context Protocol.
// Claude Code, Claude Desktop, Cursor gibi yapay zekâ istemcileri bu sunucu üzerinden
// haber10da'yı bir "araç" olarak kullanabilir: "haber10da'da kampüsle ilgili son haberler neler?"
//
// Sunucu veritabanına değil, sitenin herkese açık REST API'sine bağlanır (ince istemci).
//   HABER10DA_API=https://haber10da.net node src/mcp/server.js
//
// Claude Code'a eklemek:
//   claude mcp add haber10da -e HABER10DA_API=https://haber10da.net -- node /yol/ileri_internet_26/src/mcp/server.js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API = (process.env.HABER10DA_API ?? 'http://localhost:3000').replace(/\/$/, '');

async function api(yol) {
  const yanit = await fetch(`${API}${yol}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!yanit.ok) throw new Error(`haber10da API ${yanit.status}: ${(await yanit.text()).slice(0, 200)}`);
  return yanit.json();
}

const satir = (h) =>
  `• ${h.baslik} (${h.kategori?.ad ?? '-'}, ${new Date(h.yayinTarihi).toLocaleString('tr-TR')})\n  ${h.ozet ?? h.spot}\n  ${API}/haber/${h.slug}`;

const metin = (t) => ({ content: [{ type: 'text', text: t }] });

const sunucu = new McpServer({ name: 'haber10da', version: '1.0.0' });

sunucu.registerTool(
  'son_haberler',
  {
    title: 'Son haberler',
    description: "haber10da.net'te yayımlanan en son haberleri 10 saniyelik özetleriyle getirir.",
    inputSchema: {
      kategori: z.enum(['gundem', 'kampus', 'teknoloji', 'ekonomi', 'spor', 'kultur-sanat', 'balikesir']).optional(),
      adet: z.number().int().min(1).max(20).default(5),
    },
  },
  async ({ kategori, adet }) => {
    const q = new URLSearchParams({ limit: String(adet) });
    if (kategori) q.set('kategori', kategori);
    const { haberler } = await api(`/api/haberler?${q}`);
    return metin(haberler.length ? haberler.map(satir).join('\n\n') : 'Haber bulunamadı.');
  },
);

sunucu.registerTool(
  'haber_ara',
  {
    title: 'Haber ara',
    description: 'haber10da arşivinde tam metin arama yapar.',
    inputSchema: { sorgu: z.string().min(2).max(100) },
  },
  async ({ sorgu }) => {
    const { sonuclar, toplam } = await api(`/api/arama?q=${encodeURIComponent(sorgu)}`);
    return metin(toplam ? `${toplam} sonuç:\n\n${sonuclar.map(satir).join('\n\n')}` : `"${sorgu}" için sonuç yok.`);
  },
);

sunucu.registerTool(
  'haber_oku',
  {
    title: 'Haberi oku',
    description: 'Bir haberin tam metnini slug ile getirir.',
    inputSchema: { slug: z.string().regex(/^[a-z0-9-]+$/) },
  },
  async ({ slug }) => {
    const h = await api(`/api/haberler/${slug}`);
    return metin(`# ${h.baslik}\n\n${h.spot}\n\nÖzet: ${h.ozet ?? '-'}\n\n${h.icerik}\n\nKaynak: ${API}/haber/${h.slug}`);
  },
);

sunucu.registerResource(
  'kategoriler',
  'haber10da://kategoriler',
  { title: 'Kategoriler', description: 'haber10da kategori listesi', mimeType: 'application/json' },
  async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(await api('/api/kategoriler'), null, 2) }] }),
);

await sunucu.connect(new StdioServerTransport());
