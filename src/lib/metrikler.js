// Prometheus metrikleri — /metrics adresinden okunur, Grafana ile görselleştirilir.
import client from 'prom-client';

export const kayit = new client.Registry();
client.collectDefaultMetrics({ register: kayit, prefix: 'haber10da_' });

export const istekSuresi = new client.Histogram({
  name: 'haber10da_http_istek_suresi_saniye',
  help: 'HTTP isteklerinin yanıt süresi',
  labelNames: ['yontem', 'rota', 'durum'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [kayit],
});

export const onbellekSayaci = new client.Counter({
  name: 'haber10da_onbellek_toplam',
  help: 'Önbellek isabet/kaçırma sayısı',
  labelNames: ['sonuc'],
  registers: [kayit],
});

export const llmSayaci = new client.Counter({
  name: 'haber10da_llm_cagri_toplam',
  help: 'LLM çağrıları',
  labelNames: ['islem', 'sonuc'],
  registers: [kayit],
});

export const devreDurumu = new client.Gauge({
  name: 'haber10da_devre_kesici_acik',
  help: 'Devre kesici açık mı (1=açık)',
  labelNames: ['ad'],
  registers: [kayit],
});

export const kuyrukSayaci = new client.Counter({
  name: 'haber10da_kuyruk_mesaj_toplam',
  help: 'Kuyruk mesajları',
  labelNames: ['konu', 'sonuc'],
  registers: [kayit],
});

export const canliBaglanti = new client.Gauge({
  name: 'haber10da_canli_baglanti',
  help: 'Açık SSE ve WebSocket bağlantıları',
  labelNames: ['tur'],
  registers: [kayit],
});
