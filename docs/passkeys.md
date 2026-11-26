# Sign in with a passkey

Passkeys let you sign in with your device's fingerprint, face recognition, PIN or
security key, without running an external identity provider. Each household member
adds their own passkeys. Yuvomi stores the public credential, not the private key
or biometric data. Your authenticator or password manager manages the private key.

## Set up

1. Use a stable, browser-trusted HTTPS address and set `BASE_URL` to that origin,
   for example `https://planner.example.com`. Keep the usual HTTPS reverse-proxy
   settings (`SESSION_SECURE=true`, a correctly restricted `TRUST_PROXY`). Development
   on
   `http://localhost:<port>` is supported, but plain HTTP on a LAN address is not.
   Behind a reverse proxy, configuring `TRUST_PROXY` for the actual trusted proxy
   hops or addresses is required: the options limiter and anonymous challenge cap
   use `req.ip`. Otherwise everyone shares the proxy's bucket (five requests per
   minute by default, including cancelled prompts). Clients sharing a public IP
   still share a bucket even with correct proxy configuration.
2. Sign in to your existing account using its password or SSO.
3. Open **Settings > Account > Passkeys**, give the passkey a name and add it.
   Confirm on your device. Changes require a sign-in within the last five minutes;
   if asked, confirm your password or an existing passkey directly in the dialog.
   Password confirmation also needs a fresh TOTP or unused recovery code if your
   authenticator app is enabled. A passkey verifies you on your device. The dialog
   keeps the name you entered and continues the action after confirmation.
   SSO-only accounts must still use their normal SSO sign-in.
4. Sign out and choose **Sign in with a passkey**. Complete your device's PIN or
   biometric prompt. User verification satisfies two-factor authentication.

You can register up to ten passkeys per account. Use more than one authenticator
or a passkey provider with a recovery mechanism you understand. Keep your existing
password or linked SSO as a recovery path; this first version does not create
passkey-only accounts or change the invitation flow. The account page lists names
and last-use dates, and lets you remove your own keys after a recent sign-in.

## Existing household policies

`AUTH_ALLOW_PASSWORD_LOGIN=false` is the existing SSO-only policy. While it is
effective, native passkey sign-in and enrollment are disabled for household members,
just as native password sign-in is; the existing external-expense guest exception
still applies. Accounts explicitly configured as SSO-only also cannot enroll or
use native passkeys, independently of the household-wide switch. A passkey does not
bypass account deactivation, access restrictions or the SSO-only policy. The
configured two-factor code applies to password and SSO sign-in. The household
option to require an authenticator app still asks members to set it up and prevents
turning it off. A user-verified passkey works as a parallel sign-in method.
Shared-expense guests cannot manage passkeys. A browser with an existing guest
session can still start a fresh passkey sign-in, which requires valid credential
proof before changing the signed-in identity. Native device credentials, scoped
API tokens and paired displays cannot use the passkey routes; an unscoped API
token cannot enroll a key on someone's behalf.
`PASSKEYS_ENABLED=false` disables the feature on an installation.

## Credential changes and account recovery

Changing or resetting your password, an administrator setting a password, or the
administrator's emergency device sign-out removes
all your passkeys and pending registrations. Add replacement passkeys after recovery.
This also blocks a registration already being verified when recovery happens.
Enabling the authenticator app removes passkeys added earlier, cancels pending
registrations and ends other sessions. Add replacement passkeys after confirming
the setup code. On upgrade to the passkey MFA policy, accounts already using
TOTP also need to add replacement keys. Their account history records the removal.
Removing one passkey ends your other browser sessions and native device credentials,
while keeping the current browser and remaining passkeys. Ordinary “sign out other
devices” retains passkeys; for a compromised credential use password recovery or ask
an administrator for the emergency sign-out.

Anonymous sign-in options are limited per IP, including successful responses (at
most 20/minute). New anonymous sessions and challenges expire after five minutes.
A bucket can evict only its own anonymous challenges; user-bound registration
and confirmation are never evicted by anonymous traffic.

## Addresses and recovery

A passkey belongs to a relying party (the hostname). A hostname change requires
registering new keys at the new address; a database restore cannot change that
binding. `BASE_URL` is the authority, never a request's Host header. A backup of
Yuvomi retains the public credentials but cannot replace a lost authenticator.
Sign in using your retained password or SSO to add a replacement.

For a browser without WebAuthn support, password and SSO keep working. A cancelled
or timed-out prompt is retryable. If your device says the key is already registered,
use another authenticator or remove the existing registration first.

## Implementation

The server uses `@simplewebauthn/server`; the browser uses the native WebAuthn API
without a runtime frontend package. Discoverable credentials and user verification
are required. Registration and assertion challenges last five minutes, are bound
to the browser session and purpose, and are consumed in SQLite before verification.
Sign-in regenerates the session using the same helper as password and OIDC sign-in.
The server checks the signed WebAuthn user-verification flag. The authenticator
proves control of the credential and verifies the person locally. The signature
is bound to Yuvomi's origin and challenge, which gives resistance to phishing.
[NIST SP 800-63B-4, Syncable Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/syncable/#implementation-requirements)
Registration and removal require session authentication, CSRF and recent sign-in;
all WebAuthn POSTs require the configured Origin.

Inline confirmation preserves the signed-in identity, session ID and CSRF token.
Its passkey challenge is bound to the current account as well as the session;
it cannot be exchanged with an anonymous sign-in challenge. Failed or cancelled
confirmation never resumes the pending change. Password and passkey confirmation
share the existing sign-in rate limit and enforce the current native sign-in policy.
Enrollment requires a current, recent browser proof; when TOTP is enabled, a
password-only proof from before setup is insufficient. Failed verification is
logged with IP and a stable reason, without passwords, codes or credential payloads;
unexpected internal failures are logged separately and return 500.
