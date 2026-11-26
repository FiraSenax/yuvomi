export default {
    version: 286,
    description: 'Recent sign-in method changes for the account holder',
    up: `
    CREATE TABLE IF NOT EXISTS sign_in_changes (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN (
        'passkey_added', 'passkey_removed', 'password_changed', 'two_factor_enabled', 'two_factor_disabled'
      )),
      device TEXT,
      changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sign_in_changes_user ON sign_in_changes(user_id, id);
`,
};
