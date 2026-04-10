import { notificationsApi } from '@/api/notifications'

async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/public/config')
    if (!res.ok) return null
    const data = await res.json() as { vapidPublicKey?: string }
    return data.vapidPublicKey || null
  } catch {
    return null
  }
}

/**
 * Registra il service worker e la sottoscrizione Web Push.
 * Da chiamare al login, dopo aver ottenuto il consenso dell'utente.
 * La VAPID public key viene letta dal backend (GET /api/public/config).
 */
export async function registerPushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.info('[Push] Not supported in this browser');
    return;
  }

  const vapidPublicKey = await fetchVapidPublicKey();
  if (!vapidPublicKey) {
    console.info('[Push] VAPID public key not available — skipping push registration');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('[Push] Permission not granted');
      return;
    }

    // Converti la chiave VAPID dal formato base64url
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const { endpoint } = subscription;
    const p256dh = arrayBufferToBase64(subscription.getKey('p256dh')!);
    const auth   = arrayBufferToBase64(subscription.getKey('auth')!);

    await notificationsApi.subscribePush(endpoint, p256dh, auth);
    console.info('[Push] Subscribed successfully');
  } catch (err) {
    console.warn('[Push] Registration failed:', err);
  }
}

/**
 * Cancella la sottoscrizione push e la rimuove dal backend.
 * Da chiamare al logout.
 */
export async function unregisterPushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const { endpoint } = subscription;
    await notificationsApi.unsubscribePush(endpoint);
    await subscription.unsubscribe();
    console.info('[Push] Unsubscribed successfully');
  } catch (err) {
    console.warn('[Push] Unsubscribe failed:', err);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  const result  = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    result[i] = raw.charCodeAt(i);
  }
  return result;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
