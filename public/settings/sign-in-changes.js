import { api } from '/api.js';
import { settingRowHtml } from '/settings/components.js';
import { t } from '/i18n.js';
import { dateTimeText } from '/utils/date-format.js';
import { esc } from '/utils/html.js';

export function signInChangesCardHtml() {
  return `<section class="settings-card" aria-labelledby="sign-in-changes-title">
    <h3 class="settings-card__title" id="sign-in-changes-title">${esc(t('signInChanges.title'))}</h3>
    <div id="sign-in-changes" aria-live="polite"></div>
  </section>`;
}

/** @param {HTMLElement|null} container */
export async function renderSignInChanges(container) {
  if (!container) return;
  let content;
  try {
    /** @type {{data: {kind: string, device: string|null, changed_at: string}[]}} */
    const { data } = await api.get('/auth/me/sign-in-changes');
    content = data.length
      ? `<div class="row-carrier settings-group">${data.map(change => settingRowHtml({
        label: t(`signInChanges.${change.kind}`),
        description: `${dateTimeText(new Date(change.changed_at))} · ${change.device || t('signInChanges.unknownDevice')}`,
      })).join('')}</div>`
      : `<p class="form-hint">${esc(t('signInChanges.empty'))}</p>`;
  } catch {
    content = `<p class="form-hint">${esc(t('signInChanges.unavailable'))}</p>`;
  }
  container.replaceChildren();
  container.insertAdjacentHTML('beforeend', content);
}
