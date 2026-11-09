// GitHub ile giriş — OAuth 2.0 "authorization code" akışı + PKCE.
//
//  Tarayıcı ──1. /api/auth/github──▶ haber10da ──302──▶ github.com/login/oauth/authorize
//                                                         (client_id, state, code_challenge)
//  Kullanıcı izin verir ──▶ github ──302──▶ /api/auth/github/geri-donus?code=..&state=..
//  haber10da ──2. code + code_verifier + client_secret──▶ github (sunucudan sunucuya)
//            ◀── access_token ── ; 3. /user ve /user/emails ile profil alınır
//  haber10da kendi oturumunu açar (yenileme çerezi) ve anasayfaya yönlendirir.
import { createHash, randomBytes } from 'node:crypto';
import { config } from '../config.js';

export const DURUM_CEREZI = 'h10_oauth';

export function yetkilendirmeAdresi() {
  const state = randomBytes(16).toString('base64url'); // CSRF'e karşı: dönüşte aynısı gelmeli
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const adres = new URL('https://github.com/login/oauth/authorize');
  adres.search = new URLSearchParams({
    client_id: config.GITHUB_CLIENT_ID,
    redirect_uri: `${config.SITE_URL}/api/auth/github/geri-donus`,
    scope: 'read:user user:email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return { adres: adres.toString(), state, verifier };
}

export async function koduTakasEt(code, verifier) {
  const yanit = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: config.GITHUB_CLIENT_ID,
      client_secret: config.GITHUB_CLIENT_SECRET,
      code,
      code_verifier: verifier,
      redirect_uri: `${config.SITE_URL}/api/auth/github/geri-donus`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const veri = await yanit.json();
  if (!veri.access_token) throw new Error(veri.error_description ?? 'GitHub erişim belirteci alınamadı');
  return veri.access_token;
}

export async function profilAl(erisim) {
  const basliklar = { authorization: `Bearer ${erisim}`, accept: 'application/vnd.github+json', 'user-agent': 'haber10da' };
  const [kullanici, epostalar] = await Promise.all([
    fetch('https://api.github.com/user', { headers: basliklar }).then((r) => r.json()),
    fetch('https://api.github.com/user/emails', { headers: basliklar }).then((r) => r.json()),
  ]);
  const birincil = Array.isArray(epostalar) ? epostalar.find((e) => e.primary && e.verified) : null;
  return {
    githubId: String(kullanici.id),
    ad: kullanici.name || kullanici.login,
    eposta: birincil?.email ?? `${kullanici.login}@users.noreply.github.com`,
    avatar: kullanici.avatar_url,
  };
}
