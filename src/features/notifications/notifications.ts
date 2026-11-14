/**
 * Notifications Android (expo-notifications) : une seule permission pour toute
 * l'app (spec § 5), un canal par sorte de notification, réglable dans Android.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance, PermissionStatus } from 'expo-notifications';

import type { NewExpansion } from '@/domain/catalog';

import type { NotificationData } from './notificationData';
import { newExpansionsText, newExpansionsTitle } from './newExpansionsText';

const NEW_EXPANSIONS_CHANNEL = 'new-expansions';

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
}

/**
 * Demande la permission d'envoyer des notifications. Android ne propose sa
 * question qu'une fois un canal créé : les canaux sont créés d'abord.
 */
export async function requestNotificationPermission(): Promise<void> {
  await setUpChannels();
  await Notifications.requestPermissionsAsync();
}

/** Signale de nouvelles Extensions par une notification ; rien sans la permission. */
export async function notifyNewExpansions(expansions: readonly NewExpansion[]): Promise<void> {
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  await setUpChannels();
  const data: NotificationData = { kind: 'newExpansions', expansions: [...expansions] };
  await Notifications.scheduleNotificationAsync({
    content: {
      title: newExpansionsTitle(expansions),
      body: newExpansionsText(expansions),
      data,
    },
    trigger: { channelId: NEW_EXPANSIONS_CHANNEL },
  });
}
