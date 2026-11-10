// "Bu site nasıl çalışıyor?" — canlı bileşen durumu, etkileşimli deneyler, haftalık ders planı.
import { api } from '../api.js';
import { html, $, saatTarih } from '../yardimci.js';
import { bilesenIzgarasi } from '../bilesenler.js';
import { canliOlaylar } from '../canli.js';

const HAFTALAR = [
  {
    baslik: 'Önbellekleme ve kimlik doğrulama',
    ozet: 'Haber listeleri Redis ile önbelleğe alınıyor, tarayıcı ETag ile değişmeyen yanıtı yeniden indirmiyor. Editör girişi JWT erişim belirteci ve döndürülen yenileme belirteciyle çalışıyor; GitHub ile giriş OAuth 2.0 + PKCE kullanıyor.',
    konular: ['Caching', 'Redis', 'HTTP Caching', 'CDN', 'JWT', 'Cookie Based Auth', 'Token Authentication', 'OAuth', 'Basic Authentication'],
    dosyalar: ['src/onbellek/index.js', 'src/ara-katmanlar/httpOnbellek.js', 'src/kimlik/belirtec.js', 'src/kimlik/github.js', 'src/rotalar/auth.js'],
  },
  {
    baslik: 'Web güvenliği',
    ozet: "Parolalar bcrypt ile özetleniyor, her HTML çıktısı kaçışlanıyor, Content-Security-Policy satır içi betikleri engelliyor. CORS, Origin denetimi ve IP başına hız sınırı API'yi koruyor.",
    konular: ['HTTPS', 'CORS', 'Content Security Policy', 'OWASP Riskleri', 'bcrypt', 'SHA', 'MD5', 'Server Security', 'Rate Limiting'],
    dosyalar: ['src/ara-katmanlar/guvenlik.js', 'src/ara-katmanlar/hizSinirla.js', 'src/kimlik/parola.js', 'public/js/yardimci.js'],
  },
  {
    baslik: 'Test ve sürekli entegrasyon',
    ozet: 'Birim testleri saf fonksiyonları, entegrasyon testleri gömülü PostgreSQL üzerinde gerçek API akışlarını sınıyor. Her gönderimde GitHub Actions testleri çalıştırıyor, Docker imajını derliyor ve sunucuya dağıtıyor.',
    konular: ['Unit Testing', 'Integration Testing', 'Functional Testing', 'CI / CD', 'GitHub Actions'],
    dosyalar: ['tests/birim/', 'tests/entegrasyon/', '.github/workflows/deploy.yml'],
  },
  {
    baslik: 'Veritabanında derinleşme',
    ozet: 'Drizzle ORM ile şema, göçler ve ilişkiler. Yenileme belirteci işlemi FOR UPDATE kilitli bir transaction içinde; tam metin arama GIN, vektör benzerliği HNSW indeksi kullanıyor. N+1 sorunu aşağıdaki deneyde canlı ölçülüyor.',
    konular: ['ORMs', 'Migrations', 'ACID', 'Transactions', 'N+1 Problem', 'Normalization', 'Database Indexes', 'Profiling Performance'],
    dosyalar: ['src/db/schema.js', 'drizzle/', 'src/servisler/haberServisi.js', 'src/rotalar/sistem.js'],
  },
  {
    baslik: 'Mimari, konteynerler ve web sunucusu',
    ozet: "Site tek bir modüler monolit; yavaş işler ayrı bir worker sürecine taşınıyor. Docker Compose PostgreSQL, Redis, RabbitMQ, Elasticsearch ve Nginx'i birlikte ayağa kaldırıyor. Nginx TLS, sıkıştırma, mikro önbellek ve SSE/WebSocket yönlendirmesini yapıyor.",
    konular: ['Monolithic Apps', 'Microservices', 'Twelve-Factor Apps', 'Docker', 'Nginx', 'Database Replication', 'Sharding Strategies'],
    dosyalar: ['Dockerfile', 'docker-compose.yml', 'nginx/haber10da.conf', 'src/worker.js', 'src/config.js'],
  },
  {
    baslik: 'Gerçek zamanlı veri, arama, kuyruklar ve GraphQL',
    ozet: "Son dakika haberleri Server-Sent Events ile, 'şu an N kişi okuyor' bilgisi WebSocket ile geliyor. Yayımlanan haber RabbitMQ kuyruğuna düşüyor, worker özet ve gömme üretiyor. Arama PostgreSQL ya da Elasticsearch ile; /graphql uç noktası DataLoader ile N+1'i önlüyor.",
    konular: ['Server Sent Events', 'WebSockets', 'Long / Short Polling', 'Elasticsearch', 'RabbitMQ', 'Kafka', 'GraphQL'],
    dosyalar: ['src/canli/sse.js', 'src/canli/ws.js', 'src/kuyruk/index.js', 'src/arama/index.js', 'src/graphql/index.js'],
  },
  {
    baslik: 'Ölçek için inşa ve yapay zekâ',
    ozet: "Prometheus metrikleri, istek kimlikli yapılandırılmış günlükler, LLM'i koruyan devre kesici ve her servis için yedek davranış. Yapay zekâ tarafında yapılandırılmış çıktıyla özet, gömmelerle benzer haber ve RAG, araç çağıran akışlı asistan ve haber10da'yı yapay zekâ istemcilerine açan MCP sunucusu.",
    konular: ['Observability', 'Monitoring', 'Circuit Breaker', 'Graceful Degradation', 'Throttling', 'Backpressure', 'Embeddings', 'Vector Databases', 'RAG', 'Function Calling', 'Structured Outputs', 'Streaming', 'MCP', 'AI-Assisted Coding'],
    dosyalar: ['src/lib/devreKesici.js', 'src/lib/metrikler.js', 'src/ai/', 'src/mcp/server.js'],
  },
];

async function olc(yol, ayar = {}) {
  const bas = performance.now();
  const r = await fetch(yol, { cache: 'no-store', ...ayar });
  return { r, sure: performance.now() - bas };
}

export async function goster(kok) {
  const sistem = await api.sistem();
  kok.innerHTML = String(html`
    <header class="sayfa-baslik">
      <h1>Bu site nasıl çalışıyor?</h1>
      <p>haber10da, İleri İnternet Programlama dersinde backend yol haritasındaki konuları uygulayarak öğrenmek için yazıldı. Aşağıdaki deneyler canlı sunucu üzerinde çalışır.</p>
    </header>

    <div class="bolum-baslik"><h2>Bileşenler</h2><p>Sunucu ${Math.round(sistem.calismaSuresiSn / 60)} dakikadır çalışıyor. Sarı nokta: servis yerine yedek davranış kullanılıyor.</p></div>
    ${bilesenIzgarasi(sistem)}

    <div class="bolum-baslik"><h2>Deneyler</h2></div>
    <div class="ders-izgara">
      <section class="kart demo">
        <h3>Önbellek: Redis ve ETag</h3>
        <p>Aynı listeyi iki kez isteyin. İlki veritabanından gelir, ikincisi Redis'ten. Üçüncüde ETag gönderilir ve sunucu gövdesiz 304 yanıtı döner.</p>
        <div class="satir">
          <button class="dugme dugme--kucuk" id="d-onbellek" type="button">İstek gönder</button>
          <button class="dugme dugme--ikincil dugme--kucuk" id="d-etag" type="button">ETag ile gönder</button>
        </div>
        <div class="demo-sonuc" id="r-onbellek"></div>
      </section>
      <section class="kart demo">
        <h3>N+1 sorgu sorunu</h3>
        <p>Haber listesini yazar ve kategoriyle birlikte iki yöntemle getirin: her haber için ayrı sorgu ile ya da tek birleşik sorgu ile.</p>
        <div class="satir">
          <button class="dugme dugme--ikincil dugme--kucuk" data-mod="kotu" type="button">Döngüde sorgu</button>
          <button class="dugme dugme--kucuk" data-mod="iyi" type="button">Tek sorgu (JOIN)</button>
        </div>
        <div class="demo-sonuc" id="r-n1"></div>
      </section>
      <section class="kart demo">
        <h3>Hız sınırı</h3>
        <p>Arama uç noktası IP başına dakikada 40 istek kabul eder. Kalan hakkınız RateLimit-Remaining başlığında gelir; sınır aşılınca 429 döner.</p>
        <button class="dugme dugme--kucuk" id="d-hiz" type="button">5 arama isteği gönder</button>
        <div class="demo-sonuc" id="r-hiz"></div>
      </section>
      <section class="kart demo">
        <h3>Canlı akış (SSE)</h3>
        <p>Bu sayfa açıkken editör masasından bir haber yayımlayın; olay burada anında görünür. Bağlantı koparsa tarayıcı kendiliğinden yeniden bağlanır.</p>
        <ul class="olay-gunlugu" id="r-sse"><li>Olay bekleniyor…</li></ul>
      </section>
    </div>

    <div class="bolum-baslik"><h2>Geliştirici araçları</h2></div>
    <div class="satir">
      <a class="dugme dugme--ikincil" href="/api/belgeler" data-dis>API belgeleri (Swagger)</a>
      <a class="dugme dugme--ikincil" href="/graphql" data-dis>GraphQL arayüzü</a>
      <a class="dugme dugme--ikincil" href="/openapi.json" data-dis>OpenAPI şeması</a>
      <a class="dugme dugme--ikincil" href="/api/metrics" data-dis>Prometheus metrikleri</a>
    </div>

    <div class="bolum-baslik" id="plan"><h2>Ders planı</h2><p>roadmap.sh/backend, API'lerden sonraki konular</p></div>
    <ol class="haftalar">
      ${HAFTALAR.map(
        (h) => html`<li class="hafta">
          <div>
            <h3>${h.baslik}</h3>
            <p>${h.ozet}</p>
            <div class="konu-listesi">${h.konular.map((k) => html`<span class="cip">${k}</span>`)}</div>
            <div class="dosyalar">${h.dosyalar.map((d) => html`<code>${d}</code>`)}</div>
          </div>
        </li>`,
      )}
    </ol>`);

  // Önbellek deneyi
  let sonEtag = null;
  const ro = $('#r-onbellek', kok);
  const satirEkle = (kap, sol, sag) => {
    const d = document.createElement('div');
    d.className = 'olcu';
    d.innerHTML = String(html`<span>${sol}</span><b>${sag}</b>`);
    kap.prepend(d);
    while (kap.children.length > 4) kap.lastElementChild.remove();
  };
  $('#d-onbellek', kok).addEventListener('click', async () => {
    const { r, sure } = await olc('/api/haberler?limit=5&sayfa=1');
    sonEtag = r.headers.get('etag');
    const kaynak = r.headers.get('x-onbellek') === 'ISABET' ? 'Redis önbelleği' : 'Veritabanı';
    const sunucu = r.headers.get('server-timing')?.match(/dur=([\d.]+)/)?.[1];
    satirEkle(ro, `${r.status}, ${kaynak}`, `sunucu ${sunucu} ms, toplam ${sure.toFixed(0)} ms`);
  });
  $('#d-etag', kok).addEventListener('click', async () => {
    if (!sonEtag) {
      const ilk = await olc('/api/haberler?limit=5&sayfa=1');
      sonEtag = ilk.r.headers.get('etag');
    }
    const { r, sure } = await olc('/api/haberler?limit=5&sayfa=1', { headers: { 'If-None-Match': sonEtag } });
    satirEkle(ro, r.status === 304 ? '304 Not Modified, gövde yok' : `${r.status}, içerik değişmiş`, `${sure.toFixed(0)} ms`);
  });

  // N+1 deneyi
  for (const b of kok.querySelectorAll('[data-mod]')) {
    b.addEventListener('click', async () => {
      const d = await fetch(`/api/ders/n-arti-bir?mod=${b.dataset.mod}`).then((r) => r.json());
      satirEkle($('#r-n1', kok), d.mod === 'kotu' ? 'Döngüde sorgu' : 'Tek sorgu', `${d.sorguSayisi} sorgu, ${d.sureMs} ms`);
    });
  }

  // Hız sınırı deneyi
  $('#d-hiz', kok).addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    const rh = $('#r-hiz', kok);
    for (let i = 0; i < 5; i++) {
      const r = await fetch(`/api/arama?q=${encodeURIComponent('kampüs ' + Date.now() + i)}`, { cache: 'no-store' });
      satirEkle(rh, `${r.status === 429 ? '429 Çok fazla istek' : r.status + ' Tamam'}`, `kalan hak: ${r.headers.get('ratelimit-remaining') ?? '-'}`);
    }
    e.currentTarget.disabled = false;
  });

  // SSE günlüğü
  const gunluk = $('#r-sse', kok);
  let ilk = true;
  const olayEkle = (ad) => (e) => {
    if (ilk) gunluk.innerHTML = '';
    ilk = false;
    const li = document.createElement('li');
    li.innerHTML = String(html`<b>${ad}</b> ${e.detail.baslik} <small>${saatTarih(new Date())}</small>`);
    gunluk.prepend(li);
  };
  const dinleyiciler = ['son-dakika', 'haber-yayinlandi', 'haber-guncellendi'].map((ad) => {
    const fn = olayEkle(ad);
    canliOlaylar.addEventListener(ad, fn);
    return [ad, fn];
  });

  document.title = 'Bu site nasıl çalışıyor? — haber10da';
  if (location.hash === '#plan') $('#plan', kok).scrollIntoView();
  return () => dinleyiciler.forEach(([ad, fn]) => canliOlaylar.removeEventListener(ad, fn));
}
