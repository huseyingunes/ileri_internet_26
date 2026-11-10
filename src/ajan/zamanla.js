// Ajanı her gün belirli saatte çalışacak şekilde işletim sistemine kaydeder.
//   npm run ajan:zamanla              → AJAN_SAAT'te (varsayılan 08:00) her gün
//   npm run ajan:zamanla -- --kaldir  → kaydı siler
// Windows: Görev Zamanlayıcı (schtasks). Linux/macOS: crontab satırını yazdırır.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GOREV = 'haber10da gunluk ajan';
const kaldir = process.argv.includes('--kaldir');

if (process.platform === 'win32') {
  const cmd = path.join(KOK, 'ajan', 'gunluk-ajan.cmd');
  const arg = kaldir
    ? ['/Delete', '/TN', GOREV, '/F']
    : ['/Create', '/TN', GOREV, '/TR', `"${cmd}"`, '/SC', 'DAILY', '/ST', config.AJAN_SAAT, '/F'];
  try {
    console.log(execFileSync('schtasks', arg, { encoding: 'utf8' }).trim());
    console.log(
      kaldir
        ? 'Zamanlanmış görev silindi.'
        : `"${GOREV}" görevi her gün ${config.AJAN_SAAT} için kaydedildi. Çıktılar: .veri\\ajan.log\n` +
            `Hemen denemek için: schtasks /Run /TN "${GOREV}"`,
    );
  } catch (err) {
    console.error('schtasks çalıştırılamadı:', err.stderr?.toString() || err.message);
    process.exit(1);
  }
} else {
  const [ss, dd] = config.AJAN_SAAT.split(':').map(Number);
  console.log('Bu satırı "crontab -e" ile ekleyin:\n');
  console.log(`${dd} ${ss} * * * cd ${KOK} && ${process.execPath} src/ajan/gunluk.js >> .veri/ajan.log 2>&1`);
}
