// Kullanım: npm run rol -- ornek@eposta.com yonetici
import { auth, ROLLER } from '../firebase.js';

const [eposta, rol] = process.argv.slice(2);

if (!eposta || !ROLLER.includes(rol)) {
  console.error(`Kullanım: npm run rol -- <eposta> <${ROLLER.join('|')}>`);
  process.exit(1);
}

const kullanici = await auth.getUserByEmail(eposta);
await auth.setCustomUserClaims(kullanici.uid, { rol });
await auth.revokeRefreshTokens(kullanici.uid);
console.log(`${eposta} → ${rol} (kullanıcının yeniden giriş yapması gerekir)`);
process.exit(0);
