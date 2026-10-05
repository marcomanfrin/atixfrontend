import { CalendarDays, ChevronLeft, ChevronRight, GanttChartSquare, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User } from '@/types';
import type { CalendarView, GanttSpan } from '@/types/calendar';
import { ParticipantPicker } from './ParticipantPicker';

interface CalendarToolbarProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  span: GanttSpan;
  onSpanChange: (span: GanttSpan) => void;
  periodLabel: string;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
  onlyMine: boolean;
  onOnlyMineChange: (value: boolean) => void;
  users: User[];
  participantIds: string[];
  onParticipantIdsChange: (ids: string[]) => void;
  onCreate: () => void;
}

export function CalendarToolbar(props: CalendarToolbarProps) {
  const { t } = useTranslation('calendar');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={props.onPrevious} aria-label={t('navigation.previous')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={props.onToday}>
            {t('navigation.today')}
          </Button>
          <Button variant="outline" size="icon" onClick={props.onNext} aria-label={t('navigation.next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold capitalize sm:text-xl">{props.periodLabel}</h2>
        <Button onClick={props.onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('newEvent')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ToggleGroup
          type="single"
          variant="outline"
          value={props.view}
          onValueChange={(value) => value && props.onViewChange(value as CalendarView)}
        >
          <ToggleGroupItem value="month" aria-label={t('views.month')} className="gap-2 px-3">
            <CalendarDays className="h-4 w-4" />
            {t('views.month')}
          </ToggleGroupItem>
          <ToggleGroupItem value="gantt" aria-label={t('views.gantt')} className="gap-2 px-3">
            <GanttChartSquare className="h-4 w-4" />
            {t('views.gantt')}
          </ToggleGroupItem>
        </ToggleGroup>

        {props.view === 'gantt' && (
          <Select value={props.span} onValueChange={(value) => props.onSpanChange(value as GanttSpan)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t('spans.week')}</SelectItem>
              <SelectItem value="twoWeeks">{t('spans.twoWeeks')}</SelectItem>
              <SelectItem value="month">{t('spans.month')}</SelectItem>
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-2">
          <Switch id="only-mine" checked={props.onlyMine} onCheckedChange={props.onOnlyMineChange} />
          <Label htmlFor="only-mine" className="cursor-pointer whitespace-nowrap">{t('filters.onlyMine')}</Label>
        </div>

        <ParticipantPicker
          variant="compact"
          className="w-full sm:w-[220px]"
          users={props.users}
          value={props.participantIds}
          onChange={props.onParticipantIdsChange}
          placeholder={t('filters.allParticipants')}
        />
      </div>
    </div>
  );
}
