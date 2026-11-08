import { FileUp, RotateCcw, Share } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListScreen } from '@/components/ListScreen';
import { Switch } from '@/components/Switch';
import { Toast } from '@/components/Toast';
import { InvalidExport, type ExportContents } from '@/export/archive';
import { pickExport, shareExport, type PickedExport } from '@/export/deviceExport';
import { useJournal } from '@/journal/JournalProvider';
import { MONTHS } from '@/journal/visitDate';
import { DEFAULT_PREFERENCES } from '@/profile/preferences';
import { usePreferences } from '@/profile/PreferencesProvider';
import { statsLine } from '@/profile/stats';
import { colors, space, text } from '@/theme/tokens';

/** Where the map's data comes from, and under what terms: what its licences ask the app to say. */
const CREDITS = [
  { source: 'Natural Earth', what: 'Frontières des pays et territoires, domaine public.' },
  {
    source: 'geoBoundaries',
    what:
      'Limites des régions (William & Mary geoLab), CC BY 4.0, d’après des sources ouvertes ' +
      'propres à chaque pays, dont © les contributeurs d’OpenStreetMap (ODbL).',
  },
  { source: 'GeoNames', what: 'Villes et leurs noms, CC BY 4.0.' },
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** « L’Export du 8 novembre 2026 (12 lieux, 34 photos) »: what an Import would bring. */
function exportSummary({ exportedAt, journal }: ExportContents) {
  const date = new Date(exportedAt);
  const day = Number.isNaN(date.getTime())
    ? ''
    : ` du ${date.getDate() === 1 ? '1er' : date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  return `L’Export${day} (${plural(journal.places.length, 'lieu', 'lieux')}, ${plural(journal.photos.length, 'photo', 'photos')})`;
}

type Busy = 'export' | 'import' | null;

export default function ProfileScreen() {
  const { journal, writeExport, applyExport, resetAll } = useJournal();
  const { photosOnGlobe, autoRotate, set, replace } = usePreferences();
  const [busy, setBusy] = useState<Busy>(null);
  /** An Export picked and checked, waiting for the user to confirm its Import. */
  const [picked, setPicked] = useState<PickedExport | null>(null);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<{ key: number; message: string } | null>(null);
  const notify = (message: string) => setNotice({ key: Date.now(), message });
  const hideNotice = useCallback(() => setNotice(null), []);

  async function exportTrips() {
    setBusy('export');
    try {
      await shareExport((sink) => writeExport(sink, { photosOnGlobe, autoRotate }));
    } catch {
      notify('L’Export n’a pas pu être créé. Réessayez.');
    } finally {
      setBusy(null);
    }
  }

  async function pickToImport() {
    setBusy('import');
    try {
      const found = await pickExport();
      if (found) setPicked(found);
    } catch (error) {
      notify(error instanceof InvalidExport ? error.message : 'Ce fichier n’a pas pu être lu.');
    } finally {
      setBusy(null);
    }
  }

  async function confirmImport() {
    if (!picked) return;
    setPicked(null);
    setBusy('import');
    try {
      await applyExport(picked.contents);
      replace(picked.contents.preferences);
      notify('Vos voyages ont été importés.');
    } catch {
      notify('L’import a échoué : vos voyages n’ont pas été remplacés.');
    } finally {
      picked.close();
      setBusy(null);
    }
  }

  function cancelImport() {
    picked?.close();
    setPicked(null);
  }

  function confirmReset() {
    resetAll();
    replace(DEFAULT_PREFERENCES);
    setResetting(false);
    notify('Toutes vos données ont été supprimées.');
  }

  return (
    <ListScreen title="Profil">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.stats}>{statsLine(journal.visitedCounts())}</Text>

        <Text accessibilityRole="header" style={styles.overline}>
          Globe
        </Text>
        <Switch label="Photos sur le globe" checked={photosOnGlobe} onChange={(on) => set('photosOnGlobe', on)} />
        <Switch label="Rotation automatique" checked={autoRotate} onChange={(on) => set('autoRotate', on)} />

        <Text accessibilityRole="header" style={styles.overline}>
          Données
        </Text>
        <View style={styles.data}>
          <Text style={styles.hint}>
            Un Export rassemble vos lieux, notes, à faire et photos dans un seul fichier, à garder ou à importer sur un
            autre téléphone. Votre position n’y figure jamais.
          </Text>
          <Button variant="secondary" icon={Share} fullWidth disabled={busy !== null} onPress={exportTrips}>
            {busy === 'export' ? 'Export en cours…' : 'Exporter mes voyages'}
          </Button>
          <Button variant="secondary" icon={FileUp} fullWidth disabled={busy !== null} onPress={pickToImport}>
            {busy === 'import' ? 'Import en cours…' : 'Importer un Export'}
          </Button>
          <Button variant="ghost" icon={RotateCcw} fullWidth disabled={busy !== null} onPress={() => setResetting(true)}>
            Réinitialiser toutes les données
          </Button>
        </View>

        <Text accessibilityRole="header" style={styles.overline}>
          Crédits
        </Text>
        <View style={styles.credits}>
          {CREDITS.map(({ source, what }) => (
            <Text key={source} style={styles.credit}>
              <Text style={styles.source}>{source}</Text> — {what}
            </Text>
          ))}
        </View>
      </ScrollView>

      <ConfirmDialog
        open={picked !== null}
        title="Remplacer vos voyages ?"
        body={
          picked
            ? `${exportSummary(picked.contents)} remplacera tout ce que contient l’app : vos lieux, notes, à faire ` +
              'et photos actuels seront effacés.'
            : ''
        }
        confirm="Remplacer"
        destructive
        onConfirm={confirmImport}
        onCancel={cancelImport}
      />
      <ConfirmDialog
        open={resetting}
        title="Réinitialiser toutes les données ?"
        body={
          'Vos lieux, notes, à faire et photos seront supprimés de ce téléphone. Cette suppression est ' +
          'définitive et irréversible. Faites d’abord un Export pour pouvoir les retrouver.'
        }
        confirm="Tout supprimer"
        destructive
        onConfirm={confirmReset}
        onCancel={() => setResetting(false)}
        alternative={{
          label: busy === 'export' ? 'Export en cours…' : 'Exporter mes voyages',
          // The share sheet opens over the dialog, which stays to confirm afterwards.
          onPress: () => {
            if (busy === null) exportTrips();
          },
        }}
      />
      {notice && (
        <View style={styles.toast} pointerEvents="box-none">
          <Toast key={notice.key} message={notice.message} onHide={hideNotice} />
        </View>
      )}
    </ListScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: space[7],
  },
  stats: {
    ...text.bodyS,
    color: colors.textMuted,
    marginBottom: space[3],
  },
  // 11 pt, uppercase, +0.08 em, as the design's section titles.
  overline: {
    ...text.overline,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 11 * 0.08,
    marginTop: space[6],
    marginBottom: space[1],
  },
  data: {
    gap: space[2],
    paddingTop: space[2],
  },
  hint: {
    ...text.bodyS,
    color: colors.textSecondary,
    marginBottom: space[1],
  },
  credits: {
    gap: space[3],
    paddingTop: space[3],
  },
  credit: {
    ...text.bodyS,
    color: colors.textSecondary,
  },
  source: {
    fontFamily: text.label.fontFamily,
    color: colors.textPrimary,
  },
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: space[4],
  },
});
