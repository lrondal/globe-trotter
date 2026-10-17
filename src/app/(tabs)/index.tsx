import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Toast } from '@/components/Toast';
import type { Point } from '@/globe/camera';
import { Globe } from '@/globe/Globe';
import { recenterAction } from '@/location/launch';
import { useLocation } from '@/location/LocationProvider';
import { colors, radius, shadow, text } from '@/theme/tokens';

type Notice = { message: string; action?: string; onAction?: () => void };

const turnOnLocation: Notice = {
  message: 'La localisation est désactivée pour Globe trotter. Activez-la dans Réglages.',
  action: 'Réglages',
  onAction: () => Linking.openSettings(),
};
const noPosition: Notice = {
  message: 'Position introuvable. Vérifiez que le service de localisation est activé dans Réglages.',
};

// The Journal arrives with #6; until then it is always empty.
const journalIsEmpty = true;

export default function GlobeScreen() {
  const { launch, position, permission, request, locate } = useLocation();
  const [notice, setNotice] = useState<Notice | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  const recenter = async (): Promise<Point | null> => {
    const locateOrExplain = async () => {
      const point = await locate();
      if (!point) setNotice(noPosition);
      return point;
    };
    switch (recenterAction(position, permission)) {
      case 'fly':
        return position;
      case 'locate':
        return locateOrExplain();
      case 'ask':
        return (await request()).granted ? locateOrExplain() : null;
      case 'explain':
        setNotice(turnOnLocation);
        return null;
    }
  };

  // The root layout only shows the routes once the launch view is known.
  if (!launch) return null;

  return (
    <Globe start={launch} position={position} onRecenter={recenter}>
      {notice ? (
        <Toast {...notice} onHide={hideNotice} />
      ) : (
        journalIsEmpty && (
          <View style={styles.hint}>
            <Text style={styles.hintText}>Touchez un pays pour commencer</Text>
          </View>
        )
      )}
    </Globe>
  );
}

const styles = StyleSheet.create({
  hint: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    boxShadow: shadow[1],
  },
  hintText: {
    ...text.label,
    color: colors.textSecondary,
  },
});
