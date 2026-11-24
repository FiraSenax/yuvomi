export default {
    version: 287,
    description: 'Revoke legacy passkeys for accounts with an active authenticator app',
    // Registration before this migration did not record whether the passkey
    // was enrolled before or after TOTP. Require re-enrollment for these
    // accounts before a passkey can replace the code.
    up: `
    INSERT INTO sign_in_changes (user_id, kind)
    SELECT DISTINCT p.user_id, 'passkey_removed'
      FROM user_passkeys p JOIN user_totp t ON t.user_id = p.user_id
     WHERE t.confirmed_at IS NOT NULL;
    DELETE FROM sign_in_changes WHERE user_id IN (
      SELECT user_id FROM user_totp WHERE confirmed_at IS NOT NULL
    ) AND id IN (
      SELECT id FROM (
        SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY id DESC) AS position
          FROM sign_in_changes
         WHERE user_id IN (SELECT user_id FROM user_totp WHERE confirmed_at IS NOT NULL)
      ) WHERE position > 50
    );
    DELETE FROM user_passkeys WHERE user_id IN (
      SELECT user_id FROM user_totp WHERE confirmed_at IS NOT NULL
    );
    DELETE FROM user_passkey_handles WHERE user_id IN (
      SELECT user_id FROM user_totp WHERE confirmed_at IS NOT NULL
    );
    DELETE FROM passkey_challenges WHERE user_id IN (
      SELECT user_id FROM user_totp WHERE confirmed_at IS NOT NULL
    );
`,
};
