import { Tabs } from 'expo-router';
import { useUnreadTotal } from '@/features/chat/hooks';
import { TabBar } from '@/ui';

const TABS: { name: string; label: string }[] = [
  { name: 'index', label: 'Chats' },
  { name: 'me', label: 'Me' },
];

export default function TabsLayout() {
  const unread = useUnreadTotal().data ?? 0;
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => (
        <TabBar
          items={TABS.flatMap((tab) => {
            const route = state.routes.find((item) => item.name === tab.name);
            if (!route) return [];
            return [
              {
                key: route.key,
                label: tab.label,
                active: state.routes[state.index]?.key === route.key,
                onPress: () => navigateToTab(route.key),
                badge: tab.name === 'index' ? unread : undefined,
              },
            ];
          })}
        />
      )}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}
