import { createLogger } from '../logger.js';
import { resolveHouseholdLocale, translate } from '../utils/i18n.js';
import { runExternalJob } from '../utils/restore-state.js';
import { pushService } from './push.js';

const log = createLogger('SignInChanges');
const HISTORY_LIMIT = 50;
/** @type {Array<[RegExp, string]>} */
const platforms = [
  [/iPhone/i, 'iPhone'],
  [/iPad/i, 'iPad'],
  [/Android/i, 'Android'],
  [/CrOS/i, 'ChromeOS'],
  [/Windows/i, 'Windows'],
  [/Macintosh/i, 'macOS'],
  [/Linux/i, 'Linux'],
];

/** @typedef {ReturnType<typeof import('../db.js').get>} Database */
/** @typedef {'passkey_added'|'passkey_removed'|'password_changed'|'two_factor_enabled'|'two_factor_disabled'} ChangeKind */

/**
 * Store only a broad device label inferred from the request. Call inside the
 * transaction that changes the credential, so failures leave no history entry.
 * @param {Database} database
 * @param {number} userId
 * @param {ChangeKind} kind
 * @param {string|undefined} userAgent
 */
export function recordSignInChange(database, userId, kind, userAgent) {
  const device = platforms.find(([pattern]) => pattern.test(userAgent ?? ''))?.[1] ?? null;
  database.prepare('INSERT INTO sign_in_changes (user_id, kind, device) VALUES (?, ?, ?)').run(userId, kind, device);
  database.prepare(`
    DELETE FROM sign_in_changes WHERE user_id = ? AND id IN (
      SELECT id FROM sign_in_changes WHERE user_id = ? ORDER BY id DESC LIMIT -1 OFFSET ?
    )
  `).run(userId, userId, HISTORY_LIMIT);
}

/**
 * @param {Database} database
 * @param {number} userId
 * @returns {{kind: ChangeKind, device: string|null, changed_at: string}[]}
 */
export function listSignInChanges(database, userId) {
  return database.prepare(`
    SELECT kind, device, changed_at FROM sign_in_changes WHERE user_id = ? ORDER BY id DESC LIMIT ?
  `).all(userId, HISTORY_LIMIT);
}

/**
 * Send only to subscriptions owned by the affected account. The push is
 * best-effort after commit. The account history is available without push.
 * @param {Database} database
 * @param {number} userId
 * @param {ChangeKind} kind
 * @param {string|undefined} originFingerprint
 */
export function sendSignInChangePush(database, userId, kind, originFingerprint) {
  void runExternalJob(async () => {
    const locale = resolveHouseholdLocale(database);
    const excludeFingerprint = /^[a-f0-9]{64}$/.test(originFingerprint ?? '') ? originFingerprint : undefined;
    await pushService.sendPushToUser(userId, {
      title: translate(locale, 'signInChanges.title'),
      body: translate(locale, `signInChanges.${kind}`),
      url: '/settings/personal/account',
      tag: `sign-in-change-${kind}`,
    }, { excludeFingerprint });
  }).catch(() => log.warn('Could not send sign-in change push'));
}
