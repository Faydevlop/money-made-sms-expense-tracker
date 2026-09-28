import { useEffect } from 'react';
import { Linking } from 'react-native';
import { amountLabel } from '../components/TransactionItem';
import { parseSmsDeepLink } from '../sms/smsDeepLink';
import { useSettingsStore } from '../store/settingsStore';
import { useTransactionStore } from '../store/transactionStore';
import { useUiStore } from '../store/uiStore';

/** Records one SMS delivered by the iOS Shortcuts automation and confirms with a toast. */
async function handleUrl(url: string | null | undefined) {
  const sms = parseSmsDeepLink(url);
  if (!sms) return;
  const settings = useSettingsStore.getState();
  const toast = useUiStore.getState().showToast;
  try {
    if (!settings.trackingEnabled) {
      toast('Tracking is paused — turn it on in Settings → Transaction detection');
      return;
    }
    const r = await useTransactionStore.getState().ingest([sms], { disabledSenders: settings.disabledSenders });
    const t = r.inserted[0];
    if (t) toast(`Added · ${t.merchant} ${amountLabel(t)}`);
    else if (r.duplicates) toast('Already recorded');
    else toast('Not a transaction SMS — nothing added');
  } catch {
    toast('Could not record that SMS');
  }
}

/** Listens for moneymade://sms links, both on cold start and while the app is running. */
export function useSmsDeepLinks(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener('url', e => handleUrl(e.url));
    return () => sub.remove();
  }, [ready]);
}
