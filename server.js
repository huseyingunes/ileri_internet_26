// Sunucudaki systemd hizmeti (haber10da) bu dosyayı çalıştırır: node server.js
// Çalışma klasörünü depo kökü yapar (.env ve .veri buradan okunur), portu varsayılan 9874'e ayarlar
// ve asıl uygulamayı (src/server.js) başlatır.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [anaSurum] = process.versions.node.split('.').map(Number);
if (anaSurum < 22) {
  console.error(`haber10da Node.js 22 veya üstü ister; bu sunucuda ${process.version} var.`);
  process.exit(1);
}

process.chdir(path.dirname(fileURLToPath(import.meta.url)));
process.env.PORT ??= '9874';

await import('./src/server.js');
