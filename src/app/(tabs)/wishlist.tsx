import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ListScreen } from '@/components/ListScreen';

export default function WishlistScreen() {
  return (
    <ListScreen title="Envies">
      <EmptyState message="Aucune envie pour l’instant.">
        <Button variant="secondary" onPress={() => router.navigate('/')}>
          Ouvrir le globe
        </Button>
      </EmptyState>
    </ListScreen>
  );
}
