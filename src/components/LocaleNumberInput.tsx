import { createContext, useContext, useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { canonicalNumber, displayNumber } from '../utils/shared/parseLocaleNumber.ts';

/**
 * The page's number locale ('en', 'en-IN', 'es'), for every LocaleNumberInput
 * below it. A tool sets it once at its root instead of passing it to each card.
 */
export const NumberLocaleContext = createContext('en');

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** The tool's state: a plain number string ("2.5", "10000"), '' or 'NaN'. */
  value: string;
  /** Receives the plain number string for what was typed. */
  onValueChange: (value: string) => void;
  /** Plain string from typed text; defaults to one number. */
  toCanonical?: (raw: string, locale: string) => string;
  /** Typed text from a plain string; defaults to one number. */
  toDisplay?: (value: string, locale: string) => string;
};

/**
 * A text box that reads numbers the way the page's language writes them
 * ("10.000" is ten thousand and "2,5" two and a half on a Spanish page) and
 * hands the tool a plain number string, so the tool's math, share links and
 * CSV files keep one spelling in every language.
 *
 * The box keeps what the reader typed, so a half-typed "2," is never rewritten
 * under their cursor. It shows the tool's value afresh only when that value
 * changes from elsewhere: a share link, a reset, a CSV upload.
 */
export function LocaleNumberInput({
  value,
  onValueChange,
  toCanonical = canonicalNumber,
  toDisplay = displayNumber,
  ...rest
}: Props) {
  const locale = useContext(NumberLocaleContext);
  const [draft, setDraft] = useState(() => toDisplay(value, locale));
  const sent = useRef(value);

  useEffect(() => {
    if (value === sent.current) return;
    sent.current = value;
    setDraft(toDisplay(value, locale));
  }, [value, locale, toDisplay]);

  return (
    <input
      {...rest}
      type="text"
      value={draft}
      onChange={(e) => {
        const raw = e.target.value;
        const next = toCanonical(raw, locale);
        setDraft(raw);
        sent.current = next;
        onValueChange(next);
      }}
    />
  );
}
