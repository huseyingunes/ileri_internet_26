// Yapılandırılmış günlük (structured logging): her satır JSON — makineler okuyabilir, aranabilir.
import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
  level: config.testte ? 'silent' : config.LOG_LEVEL,
  base: { servis: 'haber10da' },
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.parola', '*.parola_ozeti'],
  transport:
    !config.uretimde && !config.testte
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
});
