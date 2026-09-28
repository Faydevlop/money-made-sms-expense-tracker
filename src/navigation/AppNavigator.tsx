import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNavigationContainerRef, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { colors } from '../constants/colors';
import { AboutScreen } from '../screens/AboutScreen';
import { AccountsScreen } from '../screens/AccountsScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { DataScreen } from '../screens/DataScreen';
import { DetectionScreen } from '../screens/DetectionScreen';
import { ExcludedScreen } from '../screens/ExcludedScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TransactionDetailsScreen } from '../screens/TransactionDetailsScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { UncategorizedScreen } from '../screens/UncategorizedScreen';
import { useUiStore } from '../store/uiStore';
import { TabBar } from './TabBar';
import { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, text: colors.ink, primary: colors.ink },
};

function Tabs() {
  return (
    <Tab.Navigator
      tabBar={props => <TabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: colors.bg } }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator({ initialRoute }: { initialRoute: 'Onboarding' | 'Tabs' }) {
  const setOnTabs = useUiStore(s => s.setOnTabs);
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={theme}
      onStateChange={() => {
        const route = navigationRef.getCurrentRoute()?.name;
        setOnTabs(route === 'Home' || route === 'Transactions' || route === 'Analytics' || route === 'Settings');
        useUiStore.getState().closeSheet();
      }}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'ios_from_right' }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Tabs" component={Tabs} options={{ animation: 'fade' }} />
        <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
        <Stack.Screen name="Review" component={UncategorizedScreen} />
        <Stack.Screen name="Detection" component={DetectionScreen} />
        <Stack.Screen name="Categories" component={CategoriesScreen} />
        <Stack.Screen name="Accounts" component={AccountsScreen} />
        <Stack.Screen name="Excluded" component={ExcludedScreen} />
        <Stack.Screen name="Data" component={DataScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
