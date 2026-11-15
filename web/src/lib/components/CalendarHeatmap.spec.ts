import CalendarHeatmap from '#lib/components/CalendarHeatmap.svelte';
import { locale } from '#lib/stores/preferences.store.ts';
import { DateTime, Info } from 'luxon';
import { render } from 'vitest-browser-svelte';

const series = Array.from({ length: 21 }, (_, index) => ({
  date: DateTime.fromISO('2026-11-01', { zone: 'utc' }).plus({ days: index }).toISODate()!,
  count: index,
}));

const data = { from: series[0].date, to: series.at(-1)!.date, series, totalCount: 0 };

const getRowLabels = (column: Element) => {
  const labels: string[] = [];
  for (const child of column.children) {
    labels.push(child.textContent?.trim() ?? '');
    if (child.classList.contains('row-span-2')) {
      labels.push('');
    }
  }
  return labels;
};

const getLabelledRows = async () => {
  const { container } = await render(CalendarHeatmap, {
    data,
    itemLabel: ({ date }: { date: string }) => date,
    totalLabel: String,
  });

  const [labelColumn, ...cells] = container.querySelector('.grid-rows-7')!.children;
  const rowLabels = getRowLabels(labelColumn);
  const padding = Number((cells[0] as HTMLElement).style.getPropertyValue('--heatmap-row-start')) - 1;

  return cells.map((_, index) => ({
    date: series[index].date,
    label: rowLabels[(padding + index) % 7],
  }));
};

const expectWeekdayLabelsToMatchDates = (rows: Array<{ date: string; label: string }>, weekdays: string[]) => {
  const labelledRows = rows.filter(({ label }) => label);
  expect(labelledRows.length).toBeGreaterThan(0);
  for (const { date, label } of labelledRows) {
    expect(label).toBe(weekdays[DateTime.fromISO(date).weekday - 1]);
  }
};

describe('CalendarHeatmap', () => {
  afterEach(() => {
    locale.set('default');
  });

  it.each(['en-US', 'en-GB', 'sv-SE', 'de-DE'])('shows every day under its own weekday label for %s', async (value) => {
    locale.set(value);
    const weekdays = Info.weekdays('short', { locale: value });

    const rows = await getLabelledRows();

    expectWeekdayLabelsToMatchDates(rows, weekdays);
  });

  it('uses the browser week start when the browser locale is selected', async () => {
    locale.set('default');
    const weekdays = Info.weekdays('short', { locale: 'en-US' });

    const rows = await getLabelledRows();

    expect(rows.find(({ date }) => date === '2026-11-15')!.label).toBe('');
    expect(rows.find(({ date }) => date === '2026-11-16')!.label).toBe(weekdays[0]);
    expectWeekdayLabelsToMatchDates(rows, weekdays);
  });
});
