import { notificationsApi } from '@/api/notifications'

/**
 * Registra il service worker e la sottoscrizione Web Push.
 * Da chiamare al login, dopo aver ottenuto il consenso dell'utente.
 *
 * La VAPID public key deve essere configurata come variabile d'ambiente:
 *   VITE_VAPID_PUBLIC_KEY=...
 */
export async function registerPushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.info('[Push] Not supported in this browser');
    return;
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidPublicKey) {
    console.info('[Push] VITE_VAPID_PUBLIC_KEY not set — skipping push registration');
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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
