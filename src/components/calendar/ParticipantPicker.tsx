import { useState } from 'react';
import { Check, ChevronsUpDown, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { colorOrFallback } from '@/lib/color';
import type { User } from '@/types';
import { fullName } from './calendarUtils';

interface ParticipantPickerProps {
  users: User[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  // "chips" shows the selection as removable chips under the trigger (dialog); "compact" shows a count (toolbar)
  variant?: 'chips' | 'compact';
}

export function ParticipantPicker({
  users,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  variant = 'chips',
}: ParticipantPickerProps) {
  const { t } = useTranslation('calendar');
  const [open, setOpen] = useState(false);
  const selected = users.filter((u) => value.includes(u.id));

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {variant === 'compact' && value.length > 0
                  ? t('filters.selectedParticipants', { count: value.length })
                  : placeholder}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('filters.searchUser')} />
            <CommandList>
              <CommandEmpty>{t('filters.noUser')}</CommandEmpty>
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem key={user.id} value={`${fullName(user)} ${user.email}`} onSelect={() => toggle(user.id)}>
                    <Check className={cn('mr-2 h-4 w-4', value.includes(user.id) ? 'opacity-100' : 'opacity-0')} />
                    <span
                      className="mr-2 h-3 w-3 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: colorOrFallback(user.calendarColor) }}
                    />
                    <span className="truncate">{fullName(user)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          {variant === 'compact' && value.length > 0 && (
            <div className="border-t p-1">
              <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>
                {t('filters.clear')}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {variant === 'chips' && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((user) => (
            <span
              key={user.id}
              className="flex items-center gap-1.5 rounded-full border bg-muted/50 py-0.5 pl-2 pr-1 text-xs"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colorOrFallback(user.calendarColor) }}
              />
              {fullName(user)}
              {!disabled && (
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-muted"
                  onClick={() => toggle(user.id)}
                  aria-label={t('common:actions.remove')}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
