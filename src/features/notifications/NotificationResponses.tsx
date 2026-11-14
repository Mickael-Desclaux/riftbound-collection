import * as Notifications from 'expo-notifications';
import { useEffect, useEffectEvent } from 'react';

import { expansionFilters } from '@/domain/catalogFilters';
import { useOpenCatalog } from '@/features/catalog/catalogRequest';

import { parseNotificationData } from './notificationData';

/**
 * Ouvre ce dont parle une notification touchée : la nouvelle Extension, dans
 * le Catalogue filtré. Couvre aussi l'app lancée par ce toucher.
 */
export function NotificationResponses() {
  const openCatalog = useOpenCatalog();

  const open = useEffectEvent((response: Notifications.NotificationResponse) => {
    // Traitée une seule fois, même si les onglets sont recréés.
    Notifications.clearLastNotificationResponse();
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const data = parseNotificationData(response.notification.request.content.data);
    if (data?.kind === 'newExpansions') openCatalog(expansionFilters(data.expansions));
  });

  useEffect(() => {
    const launchedBy = Notifications.getLastNotificationResponse();
    if (launchedBy) open(launchedBy);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      open(response),
    );
    return () => subscription.remove();
  }, []);

  return null;
}
