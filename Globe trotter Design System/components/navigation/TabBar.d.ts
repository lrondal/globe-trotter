/** Bottom tab bar of the mobile app: Globe, Carnet, Envies, Profil. */
export interface TabBarItem { id: string; label: string; /** Lucide icon */ icon: string }
export interface TabBarProps {
  items: TabBarItem[];
  value: string;
  onChange?: (id: string) => void;
}
export declare function TabBar(props: TabBarProps): JSX.Element;
