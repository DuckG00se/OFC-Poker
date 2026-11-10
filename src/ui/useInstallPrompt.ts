import { useCallback, useEffect, useState } from 'react';

/** Chromium's install-prompt event (not in the standard DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallPrompt {
  /** The browser has offered to install the app and has not been answered yet. */
  canInstall: boolean;
  install: () => void;
}

/**
 * Lets the app offer "Install" itself. Browsers that support it fire `beforeinstallprompt`
 * once the app qualifies as installable; iOS Safari does not, and uses "Add to Home Screen"
 * from its share menu instead.
 */
export const useInstallPrompt = (): InstallPrompt => {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event): void => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = (): void => setEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(() => {
    if (!event) return;
    void event.prompt();
    void event.userChoice.finally(() => setEvent(null));
  }, [event]);

  return { canInstall: event !== null, install };
};
