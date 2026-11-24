/** Identify the current push subscription without sending its private endpoint. */
export async function currentPushFingerprint() {
  if (!globalThis.navigator?.serviceWorker || !globalThis.crypto?.subtle) return undefined;

  let timer;
  try {
    const lookup = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const sub = await registration?.pushManager?.getSubscription();
      if (!sub) return undefined;
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sub.endpoint));
      return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    };
    // Credential changes must still work when the service worker is suspended.
    return await Promise.race([lookup(), new Promise(resolve => { timer = setTimeout(resolve, 250); })]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
