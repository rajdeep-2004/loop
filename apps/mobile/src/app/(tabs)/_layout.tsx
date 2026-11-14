import { Tabs } from 'expo-router';
import { TabBar } from '@/ui';

const TAB_LABELS: Record<string, string> = { me: 'Me' };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => (
        <TabBar
          items={state.routes
            .filter((route) => TAB_LABELS[route.name])
            .map((route) => ({
              key: route.key,
              label: TAB_LABELS[route.name]!,
              active: state.routes[state.index]?.key === route.key,
              onPress: () => navigateToTab(route.key),
            }))}
        />
      )}>
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
