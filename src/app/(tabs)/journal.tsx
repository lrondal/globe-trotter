import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ListScreen } from '@/components/ListScreen';

export default function JournalScreen() {
  return (
    <ListScreen title="Carnet">
      <EmptyState message="Aucun lieu dans le carnet.">
        <Button variant="secondary" onPress={() => router.navigate('/')}>
          Ouvrir le globe
        </Button>
      </EmptyState>
    </ListScreen>
  );
}
