import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Loading } from './src/components/common';
import { SheetHost, ToastHost } from './src/components/SheetHost';
import { PillButton } from './src/components/ui/controls';
import { T } from './src/components/ui/T';
import { colors } from './src/constants/colors';
import { useSmsTracking } from './src/hooks/useSmsTracking';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useSettingsStore } from './src/store/settingsStore';
import { useTransactionStore } from './src/store/transactionStore';

type Boot = 'loading' | 'ready' | 'error';

function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.error}>
      <T size={28} w={800} i>
        Couldn’t open your data
      </T>
      <T size={15} color={colors.muted}>
        Money Made could not open its on-device database. Your data has not been changed. Please try again.
      </T>
      <PillButton label="Try again" onPress={onRetry} style={styles.retry} />
    </View>
  );
}

export default function App() {
  const [boot, setBoot] = useState<Boot>('loading');
  const onboardingDone = useSettingsStore(s => s.onboardingDone);

  const start = useCallback(async () => {
    setBoot('loading');
    try {
      await useSettingsStore.getState().load();
      await useTransactionStore.getState().load();
      setBoot(useTransactionStore.getState().status === 'ready' ? 'ready' : 'error');
    } catch {
      setBoot('error');
    }
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  useSmsTracking(boot === 'ready');

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <View style={styles.root}>
        {boot === 'loading' ? <Loading /> : null}
        {boot === 'error' ? <ErrorScreen onRetry={start} /> : null}
        {boot === 'ready' ? (
          <>
            <AppNavigator initialRoute={onboardingDone ? 'Tabs' : 'Onboarding'} />
            <SheetHost />
            <ToastHost />
          </>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  error: { flex: 1, justifyContent: 'center', padding: 24, gap: 10, backgroundColor: colors.bg },
  retry: { marginTop: 12 },
});
