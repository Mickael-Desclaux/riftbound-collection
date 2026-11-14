/**
 * Notifications Android (expo-notifications) : une seule permission pour toute
 * l'app (spec § 5), un canal par sorte de notification, réglable dans Android.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance, PermissionStatus } from 'expo-notifications';

import type { NewExpansion } from '@/domain/catalog';
import type { PriceAlert } from '@/domain/priceAlert';

import type { NotificationData } from './notificationData';
import { newExpansionsText, newExpansionsTitle } from './newExpansionsText';
import { priceAlertsText, priceAlertsTitle } from './priceAlertsText';

const NEW_EXPANSIONS_CHANNEL = 'new-expansions';
const PRICE_ALERTS_CHANNEL = 'price-alerts';

/**
 * Une notification n'est envoyée app ouverte que si aucun écran ne peut
 * afficher le message (app pas encore prête) : elle doit alors s'afficher.
 */
export function showNotificationsInForeground(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** `undetermined` : pas encore demandée ; `denied` : refusée, à rétablir dans Android. */
export type NotificationPermission = 'granted' | 'undetermined' | 'denied';

export async function getNotificationPermission(): Promise<NotificationPermission> {
  const { granted, status } = await Notifications.getPermissionsAsync();
  if (granted) return 'granted';
  return status === PermissionStatus.UNDETERMINED ? 'undetermined' : 'denied';
}

async function setUpChannels(): Promise<void> {
  await Notifications.setNotificationChannelAsync(NEW_EXPANSIONS_CHANNEL, {
    name: 'Nouvelles extensions',
    importance: AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync(PRICE_ALERTS_CHANNEL, {
    name: 'Alertes de prix des souhaits',
    importance: AndroidImportance.DEFAULT,
  });
}

/**
 * Demande la permission d'envoyer des notifications. Android ne propose sa
 * question qu'une fois un canal créé : les canaux sont créés d'abord.
 */
export async function requestNotificationPermission(): Promise<void> {
  await setUpChannels();
  await Notifications.requestPermissionsAsync();
}

/** Envoie une notification sur `channelId` ; dit si elle est partie (pas sans la permission). */
async function notify(
  channelId: string,
  content: { title: string; body: string; data: NotificationData },
): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return false;
  await setUpChannels();
  await Notifications.scheduleNotificationAsync({ content, trigger: { channelId } });
  return true;
}

/** Signale de nouvelles Extensions par une notification. */
export async function notifyNewExpansions(expansions: readonly NewExpansion[]): Promise<boolean> {
  return notify(NEW_EXPANSIONS_CHANNEL, {
    title: newExpansionsTitle(expansions),
    body: newExpansionsText(expansions),
    data: { kind: 'newExpansions', expansions: [...expansions] },
  });
}

/** Signale des Alertes de prix par une seule notification, qui ouvre l'onglet Souhaits. */
export async function notifyPriceAlerts(alerts: readonly PriceAlert[]): Promise<boolean> {
  return notify(PRICE_ALERTS_CHANNEL, {
    title: priceAlertsTitle(alerts),
    body: priceAlertsText(alerts),
    data: { kind: 'priceAlerts' },
  });
}
