// OpenAI uyumlu LLM istemcisi — /chat/completions ve /embeddings uç noktaları.
// Aynı kod OpenAI, vLLM, Ollama, Gemini (OpenAI uyumlu uç nokta), OpenRouter ile çalışır.
// Tüm çağrılar devre kesiciden geçer: LLM çökerse site çökmez, yedek davranışa geçer.
import { config } from '../config.js';
import { DevreKesici } from '../lib/devreKesici.js';
import { devreDurumu, llmSayaci } from '../lib/metrikler.js';
import { logger } from '../lib/logger.js';

export const llmDevresi = new DevreKesici('llm', { esik: 3, beklemeMs: 30_000 });
llmDevresi.durumDegisti((d) => {
  devreDurumu.set({ ad: 'llm' }, d === 'ACIK' ? 1 : 0);
  logger.warn({ durum: d }, 'LLM devre kesici durumu değişti');
});

function basliklar() {
  const b = { 'content-type': 'application/json' };
  if (config.LLM_API_KEY) b.authorization = `Bearer ${config.LLM_API_KEY}`;
  return b;
}

async function postIstek(taban, yol, govde, zamanAsimiMs = 30_000) {
  const yanit = await fetch(`${taban.replace(/\/$/, '')}${yol}`, {
    method: 'POST',
    headers: basliklar(),
    body: JSON.stringify(govde),
    signal: AbortSignal.timeout(zamanAsimiMs),
  });
  if (!yanit.ok) {
    const metin = await yanit.text().catch(() => '');
    throw new Error(`LLM ${yanit.status}: ${metin.slice(0, 200)}`);
  }
  return yanit;
}

export function llmKullanilabilir() {
  return config.llmAcik && llmDevresi.durum !== 'ACIK';
}

// Tek seferlik yanıt. sema verilirse "yapılandırılmış çıktı" (JSON Schema) istenir.
export async function sohbet({ mesajlar, araclar, sema, sicaklik = 0.3, azamiToken = 800 }) {
  if (!config.llmAcik) throw new Error('LLM yapılandırılmamış');
  return llmDevresi.calistir(async () => {
    const govde = { model: config.LLM_MODEL, messages: mesajlar, temperature: sicaklik, max_tokens: azamiToken };
    if (araclar) govde.tools = araclar;
    if (sema) govde.response_format = { type: 'json_schema', json_schema: { name: sema.ad, strict: true, schema: sema.sema } };
    try {
      const yanit = await postIstek(config.LLM_BASE_URL, '/chat/completions', govde);
      const veri = await yanit.json();
      llmSayaci.inc({ islem: 'sohbet', sonuc: 'basarili' });
      return veri.choices[0].message;
    } catch (err) {
      llmSayaci.inc({ islem: 'sohbet', sonuc: 'hata' });
      throw err;
    }
  });
}

// Akışlı yanıt (stream: true). Sunucu "data: {...}" satırları gönderir (SSE biçimi).
// Metin parçalarını anında verir; araç çağrıları parça parça gelir, sonunda birleştirilir.
export async function* sohbetAkisi({ mesajlar, araclar, sicaklik = 0.3, azamiToken = 900 }) {
  if (!config.llmAcik) throw new Error('LLM yapılandırılmamış');
  const yanit = await llmDevresi.calistir(() =>
    postIstek(
      config.LLM_BASE_URL,
      '/chat/completions',
      { model: config.LLM_MODEL, messages: mesajlar, tools: araclar, temperature: sicaklik, max_tokens: azamiToken, stream: true },
      60_000,
    ),
  );
  llmSayaci.inc({ islem: 'akis', sonuc: 'basarili' });
  const cozucu = new TextDecoder();
  const araclarTampon = [];
  let tampon = '';
  for await (const parca of yanit.body) {
    tampon += cozucu.decode(parca, { stream: true });
    const satirlar = tampon.split('\n');
    tampon = satirlar.pop();
    for (const satir of satirlar) {
      const s = satir.trim();
      if (!s.startsWith('data:')) continue;
      const veri = s.slice(5).trim();
      if (veri === '[DONE]') continue;
      let olay;
      try {
        olay = JSON.parse(veri);
      } catch {
        continue;
      }
      const delta = olay.choices?.[0]?.delta;
      if (!delta) continue;
      if (delta.content) yield { tur: 'metin', metin: delta.content };
      for (const ac of delta.tool_calls ?? []) {
        const i = ac.index ?? 0;
        araclarTampon[i] ??= { id: '', type: 'function', function: { name: '', arguments: '' } };
        if (ac.id) araclarTampon[i].id = ac.id;
        if (ac.function?.name) araclarTampon[i].function.name += ac.function.name;
        if (ac.function?.arguments) araclarTampon[i].function.arguments += ac.function.arguments;
      }
    }
  }
  if (araclarTampon.length) yield { tur: 'araclar', araclar: araclarTampon.filter(Boolean) };
}

export async function gommeIste(metinler) {
  const taban = config.EMBED_BASE_URL ?? config.LLM_BASE_URL;
  return llmDevresi.calistir(async () => {
    const yanit = await postIstek(taban, '/embeddings', {
      model: config.EMBED_MODEL,
      input: metinler,
      dimensions: config.EMBED_BOYUT, // destekleyen modeller boyutu küçültür (Matryoshka)
    });
    const veri = await yanit.json();
    llmSayaci.inc({ islem: 'gomme', sonuc: 'basarili' });
    return veri.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  });
}
