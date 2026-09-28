import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Transactions: undefined;
  Analytics: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Onboarding: { startAt?: 'intro' | 'permission' } | undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  TransactionDetails: { id: string };
  Review: undefined;
  Detection: undefined;
  Categories: undefined;
  Accounts: undefined;
  Excluded: undefined;
  Data: undefined;
  About: undefined;
  ShortcutSetup: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
