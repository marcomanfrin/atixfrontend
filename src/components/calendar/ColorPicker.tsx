import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CALENDAR_PALETTE, isHexColor, readableTextColor } from '@/lib/color';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

// Palette swatches plus a custom colour (native picker + hex field)
export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  const { t } = useTranslation('calendar');
  const normalized = value.toUpperCase();
  const valid = isHexColor(value);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-8 gap-2">
        {CALENDAR_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            disabled={disabled}
            onClick={() => onChange(color)}
            aria-label={color}
            aria-pressed={normalized === color}
            className="flex aspect-square w-full max-w-9 items-center justify-center rounded-full border border-black/10 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            style={{ backgroundColor: color }}
          >
            {normalized === color && <Check className="h-4 w-4" style={{ color: readableTextColor(color) }} />}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('color.custom')}</span>
        <input
          type="color"
          disabled={disabled}
          value={valid ? value : '#000000'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-12 cursor-pointer rounded border bg-transparent p-1"
          aria-label={t('color.custom')}
        />
        <Input
          value={value}
          disabled={disabled}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          className={cn('w-28 font-mono uppercase', !valid && value && 'border-destructive')}
          aria-invalid={!valid}
        />
      </div>
      {!valid && value && <p className="text-xs text-destructive">{t('color.invalid')}</p>}
    </div>
  );
}
