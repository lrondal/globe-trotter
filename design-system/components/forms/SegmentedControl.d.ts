/** Switch between mutually exclusive views — main use: Pays / Régions / Villes granularity. */
export interface SegmentedControlProps {
  options: Array<string | { value: string; label: string }>;
  value: string;
  onChange?: (value: string) => void;
  fullWidth?: boolean;
}
export declare function SegmentedControl(props: SegmentedControlProps): JSX.Element;
