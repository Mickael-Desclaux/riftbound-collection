import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getNotificationPermission, type NotificationPermission } from './notifications';

/**
 * La permission des notifications, relue au retour dans l'app : elle a pu
 * changer dans les réglages d'Android. `undefined` tant qu'elle n'est pas lue.
 */
export function useNotificationPermission(): NotificationPermission | undefined {
  const [permission, setPermission] = useState<NotificationPermission>();
  useEffect(() => {
    let current = true;
    const read = () => {
      getNotificationPermission()
        .then((value) => {
          if (current) setPermission(value);
        })
        .catch((error: unknown) => console.warn('Permission des notifications illisible', error));
    };
    read();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => {
      current = false;
      subscription.remove();
    };
  }, []);
  return permission;
}
