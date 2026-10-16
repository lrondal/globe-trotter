import { Tabs } from 'expo-router';
import { Bookmark, Globe, NotebookPen, UserRound, type LucideIcon } from 'lucide-react-native';

import { colors, fonts } from '@/theme/tokens';

const ACTIVE = colors.textPrimary;
const INACTIVE = colors.ink4;

const tabIcon =
  (Icon: LucideIcon) =>
  ({ focused }: { focused: boolean }) => (
    <Icon color={focused ? ACTIVE : INACTIVE} size={24} strokeWidth={2} />
  );

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: colors.surfaceRaised,
          borderTopColor: colors.borderDefault,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.surfacePage },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Globe', tabBarIcon: tabIcon(Globe) }} />
      <Tabs.Screen name="journal" options={{ title: 'Carnet', tabBarIcon: tabIcon(NotebookPen) }} />
      <Tabs.Screen name="wishlist" options={{ title: 'Envies', tabBarIcon: tabIcon(Bookmark) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon(UserRound) }} />
    </Tabs>
  );
}
