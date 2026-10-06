import { useEffect, useState } from 'react';
import { Briefcase, ChevronsUpDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useWorks } from '@/hooks/api';
import type { CalendarWorkRef } from '@/types/calendar';

interface WorkPickerProps {
  value: CalendarWorkRef | null;
  onChange: (work: CalendarWorkRef | null) => void;
}

interface WorkOption {
  id: string;
  name?: string;
  orderNumber?: string;
  atixClient?: { name?: string } | null;
}

const workLabel = (work: Omit<WorkOption, 'id'>) =>
  [work.orderNumber, work.atixClient?.name ?? work.name].filter(Boolean).join(' - ') || work.name || '';

export function WorkPicker({ value, onChange }: WorkPickerProps) {
  const { t } = useTranslation('calendar');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isFetching } = useWorks(open ? { search: debouncedSearch || undefined, page: 0, size: 20 } : null);
  const works = (data?.content ?? []) as unknown as WorkOption[];

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="min-w-0 flex-1 justify-between font-normal">
            <span className="flex min-w-0 items-center gap-2">
              <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className={value ? 'truncate' : 'truncate text-muted-foreground'}>
                {value?.label ?? t('dialog.workPlaceholder')}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[260px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder={t('dialog.searchWork')} value={search} onValueChange={setSearch} />
            <CommandList>
              {!isFetching && <CommandEmpty>{t('dialog.noWork')}</CommandEmpty>}
              <CommandGroup>
                {works.map((work) => (
                  <CommandItem
                    key={work.id}
                    value={work.id}
                    onSelect={() => {
                      onChange({ id: work.id, label: workLabel(work) });
                      setOpen(false);
                    }}
                  >
                    <div className="min-w-0">
                      <div className="truncate">{workLabel(work)}</div>
                      {work.name && <div className="truncate text-xs text-muted-foreground">{work.name}</div>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)} aria-label={t('dialog.removeWork')}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
