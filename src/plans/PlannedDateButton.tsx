// A Plan's Planned date, as a button: « Avril 2027 », or « Un jour » without one. It opens a
// month picker, from which the date can also be taken off.
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { MonthDialog } from '@/components/MonthDialog';
import { useJournal } from '@/journal/JournalProvider';
import { monthOf } from '@/journal/visitDate';
import { formatVisitDates } from '@/sheet/visitDate';

/** « Avril 2027 », or « Un jour » for a Plan without a Planned date. */
export const formatPlannedDate = (plannedDate: string | null) =>
  plannedDate ? formatVisitDates({ from: plannedDate, to: plannedDate }) : 'Un jour';

type Props = { countryId: string; plannedDate: string | null };

export function PlannedDateButton({ countryId, plannedDate }: Props) {
  const { setPlannedDate } = useJournal();
  const [open, setOpen] = useState(false);
  const set = (month: string | null) => {
    setOpen(false);
    setPlannedDate(countryId, month);
  };
  return (
    <>
      <Button variant="secondary" size="sm" icon={CalendarDays} onPress={() => setOpen(true)}>
        {formatPlannedDate(plannedDate)}
      </Button>
      <MonthDialog
        open={open}
        title="Date prévue"
        initial={plannedDate ?? monthOf(new Date())}
        onConfirm={set}
        onCancel={() => setOpen(false)}
        clear={plannedDate ? { label: 'Un jour', onPress: () => set(null) } : undefined}
      />
    </>
  );
}
