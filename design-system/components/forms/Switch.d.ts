/** On/off setting, e.g. "Afficher les photos sur le globe". */
export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}
export declare function Switch(props: SwitchProps): JSX.Element;
