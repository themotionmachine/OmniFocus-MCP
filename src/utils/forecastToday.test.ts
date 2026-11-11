import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  buildForecastToday,
  FORECAST_SETTING_KEYS,
  ForecastCandidate,
  forecastOrderKey,
  forecastTodayReasons,
  resolveForecastSettings,
} from './forecastToday.js';
import { formatDateLocal } from './dateSerialization.js';
import { resolveForecastResult } from '../tools/primitives/getPerspectiveView.js';
import { forecastOrderLine } from '../tools/definitions/getPerspectiveView.js';

// Wed Nov 11 2026, 10:00 local — whatever the host timezone.
const NOW = new Date(2026, 10, 11, 10, 0, 0);
const at = (day: number, hour = 8) => formatDateLocal(new Date(2026, 10, day, hour, 0, 0));

function task(id: string, overrides: Partial<ForecastCandidate> = {}): ForecastCandidate {
  return {
    id,
    name: id,
    flagged: false,
    effectivePlannedDate: null,
    effectiveDueDate: null,
    effectiveDeferDate: null,
    notificationDate: null,
    tagIds: [],
    ...overrides,
  };
}

// The settings of the database this was built against: Flexible, custom
// order allowed, Unplanned tag blessed, everything else at its default.
const RAW = {
  _ForecastAllowCustomOrder: true,
  _ForecastBlessedTagIdentifier: 'unplannedTag',
  _ForecastIncludeDeferredItems: false,
  _ForecastIncludeItemsWithScheduledNotifications: false,
  _ForecastIsOrganizedIntoGroups: false,
  ForecastFlatListCustomOrder: {
    '11/10/26': ['yesterdayOnly'],
    '11/11/26': ['p5QnuecVBv7.628', 'gone', 'b', '8:35 AM,9:00 AM', 'a', 'b'],
  },
};

describe('resolveForecastSettings', () => {
  it('uses the defaults for keys that are not stored', () => {
    expect(resolveForecastSettings({})).toEqual({
      includePlanned: true,
      includeDeferred: false,
      includeNotifications: false,
      todayIncludesFlagged: true,
      blessedTagId: null,
      organizedIntoGroups: false,
      allowCustomOrder: false,
      flatCustomOrder: {},
    });
  });

  it('reads stored values, including the per-day order lists', () => {
    const s = resolveForecastSettings(RAW);
    expect(s.allowCustomOrder).toBe(true);
    expect(s.blessedTagId).toBe('unplannedTag');
    expect(s.flatCustomOrder['11/11/26'][0]).toBe('p5QnuecVBv7.628');
  });

  it('ignores malformed values rather than throwing', () => {
    const s = resolveForecastSettings({
      _ForecastIncludePlannedItems: 'yes?',
      _ForecastBlessedTagIdentifier: '',
      ForecastFlatListCustomOrder: ['not', 'a', 'dict'],
    });
    expect(s.includePlanned).toBe(true);
    expect(s.blessedTagId).toBeNull();
    expect(s.flatCustomOrder).toEqual({});
  });
});

describe('forecastOrderKey', () => {
  it('formats as M/D/YY without zero padding on month and day', () => {
    expect(forecastOrderKey(new Date(2026, 10, 11))).toBe('11/11/26');
    expect(forecastOrderKey(new Date(2026, 0, 5))).toBe('1/5/26');
    expect(forecastOrderKey(new Date(2005, 0, 5))).toBe('1/5/05');
  });
});

describe('forecastTodayReasons', () => {
  const s = resolveForecastSettings(RAW);

  it('includes items planned or due today', () => {
    expect(forecastTodayReasons(task('x', { effectivePlannedDate: at(11) }), s, NOW)).toEqual(['planned']);
    expect(forecastTodayReasons(task('x', { effectiveDueDate: at(11, 23) }), s, NOW)).toEqual(['due']);
  });

  it('excludes dates on other days (earlier ones belong to Past)', () => {
    expect(forecastTodayReasons(task('x', { effectivePlannedDate: at(10) }), s, NOW)).toEqual([]);
    expect(forecastTodayReasons(task('x', { effectiveDueDate: at(12, 0) }), s, NOW)).toEqual([]);
  });

  it('includes flagged and blessed-tag items regardless of date', () => {
    expect(forecastTodayReasons(task('x', { flagged: true }), s, NOW)).toEqual(['flagged']);
    expect(forecastTodayReasons(task('x', { tagIds: ['unplannedTag'] }), s, NOW)).toEqual(['tagged']);
  });

  it('honors the include toggles', () => {
    const off = resolveForecastSettings({
      _ForecastIncludePlannedItems: false,
      _ForecastTodayIncludesFlaggedItems: false,
    });
    expect(forecastTodayReasons(task('x', { effectivePlannedDate: at(11), flagged: true }), off, NOW)).toEqual([]);

    const deferred = task('x', { effectiveDeferDate: at(11) });
    expect(forecastTodayReasons(deferred, s, NOW)).toEqual([]);
    const on = resolveForecastSettings({ _ForecastIncludeDeferredItems: true });
    expect(forecastTodayReasons(deferred, on, NOW)).toEqual(['deferred']);

    const notified = task('x', { notificationDate: at(11, 14) });
    expect(forecastTodayReasons(notified, s, NOW)).toEqual([]);
    const withNotifications = resolveForecastSettings({ _ForecastIncludeItemsWithScheduledNotifications: true });
    expect(forecastTodayReasons(notified, withNotifications, NOW)).toEqual(['notification']);
  });
});

describe('buildForecastToday', () => {
  const candidates = [
    task('late', { effectivePlannedDate: at(11, 15) }),
    task('a', { effectivePlannedDate: at(11, 0) }),
    task('notToday', { effectivePlannedDate: at(12) }),
    task('early', { effectiveDueDate: at(11, 7) }),
    task('b', { effectivePlannedDate: at(11, 8) }),
    task('flaggedOnly', { flagged: true }),
    task('p5QnuecVBv7.628', { effectiveDeferDate: at(11), tagIds: ['unplannedTag'] }),
  ];

  it("puts the user's dragged order first, then the rest by time", () => {
    const today = buildForecastToday(candidates, resolveForecastSettings(RAW), NOW);
    expect(today.items.map(t => t.id)).toEqual([
      // dragged order; 'gone', the event slot, and the duplicate 'b' are skipped
      'p5QnuecVBv7.628', 'b', 'a',
      // never dragged: by today's time, undated (flagged-only) last
      'early', 'late', 'flaggedOnly',
    ]);
    expect(today.orderSource).toBe('custom');
    expect(today.customOrderedCount).toBe(3);
  });

  it('ignores the custom order when Keep sorted is on', () => {
    const today = buildForecastToday(
      candidates,
      resolveForecastSettings({ ...RAW, _ForecastAllowCustomOrder: false }),
      NOW,
    );
    expect(today.items.map(t => t.id)).toEqual(['a', 'early', 'b', 'late', 'flaggedOnly', 'p5QnuecVBv7.628']);
    expect(today.orderSource).toBe('time');
  });

  it('ignores the flat order in Organized structure, which keeps per-section orders', () => {
    const today = buildForecastToday(
      candidates,
      resolveForecastSettings({ ...RAW, _ForecastIsOrganizedIntoGroups: true }),
      NOW,
    );
    expect(today.orderSource).toBe('time');
  });

  it('only uses the list for today, not other days', () => {
    const tomorrow = new Date(2026, 10, 12, 10);
    const today = buildForecastToday(candidates, resolveForecastSettings(RAW), tomorrow);
    expect(today.items.map(t => t.id)).toEqual(['notToday', 'flaggedOnly', 'p5QnuecVBv7.628']);
    expect(today.orderSource).toBe('time');
  });

  it('records why each item is in Today', () => {
    const today = buildForecastToday(candidates, resolveForecastSettings(RAW), NOW);
    expect(today.items.find(t => t.id === 'p5QnuecVBv7.628')!.forecastReasons).toEqual(['tagged']);
  });
});

describe('resolveForecastResult', () => {
  it('drops the membership-only fields from returned items', () => {
    const { items, info } = resolveForecastResult(
      { settings: RAW, candidates: [task('a', { effectivePlannedDate: at(11), projectName: 'P' })] },
      NOW,
    );
    expect(items).toEqual([{ id: 'a', name: 'a', flagged: false, projectName: 'P', forecastReasons: ['planned'] }]);
    expect(info).toMatchObject({ orderSource: 'custom', customOrderedCount: 1, totalCount: 1 });
  });
});

describe('forecastOrderLine', () => {
  it('says whether the order is the user\'s or a time sort', () => {
    expect(forecastOrderLine({ orderSource: 'custom', customOrderedCount: 3, totalCount: 5 }))
      .toBe('Today, in your Forecast order (2 not yet ordered, by time at the end).');
    expect(forecastOrderLine({ orderSource: 'time', customOrderedCount: 0, totalCount: 2 }))
      .toMatch(/sorted by time/);
  });

  it('flags settings that could not be read', () => {
    expect(forecastOrderLine({
      orderSource: 'time', customOrderedCount: 0, totalCount: 0,
      settingErrors: { _ForecastAllowCustomOrder: 'boom' },
    })).toMatch(/Could not read settings: _ForecastAllowCustomOrder/);
  });
});

describe('getPerspectiveView.js Forecast branch', () => {
  const script = readFileSync(join(__dirname, 'omnifocusScripts', 'getPerspectiveView.js'), 'utf8');

  it('reads every setting key the Node side resolves', () => {
    for (const key of FORECAST_SETTING_KEYS) {
      expect(script).toContain(`"${key}"`);
    }
  });
});
