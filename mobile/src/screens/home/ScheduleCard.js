import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';
import { AppText, Card } from '../../components/ui';
import { DAYS, isoOf } from '../../lib/format';
import { effectiveRoutine } from '../../lib/history';
import { dateLocale, t } from '../../lib/i18n';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const heatmapEntrance = FadeIn.duration(150).easing(Easing.bezier(0.23, 1, 0.32, 1));

const WeekView = React.memo(function WeekView({ weekDays, today, done, S, colors, setOverrideDay, highlightDate }) {
  const weekday = new Intl.DateTimeFormat(dateLocale(), { weekday: 'short' });
  return (
    <View style={styles.week}>
      {weekDays.map(({ date, iso }) => {
        const planned = effectiveRoutine(S, iso);
        return (
          <Pressable
            key={iso}
            onPress={() => setOverrideDay(iso)}
            accessibilityRole="button"
            accessibilityLabel={`${t(DAYS[date.getDay()])} ${date.getDate()}`}
            accessibilityState={{ selected: iso === today }}
            style={({ pressed }) => [styles.day, { minHeight: 48, opacity: pressed ? 0.6 : 1 }]}
          >
            <AppText muted style={{ fontSize: 11 }}>{weekday.format(date)}</AppText>
            <View style={[styles.dayNumber, iso === today && { backgroundColor: colors.accent }]}>
              <AppText style={{ fontWeight: '800', color: iso === today ? colors.onAccent : colors.text }}>
                {date.getDate()}
              </AppText>
            </View>
            <Animated.View
              key={iso === highlightDate ? `highlight-${iso}` : iso}
              entering={iso === highlightDate ? heatmapEntrance : undefined}
              style={[
                styles.dot,
                { backgroundColor: done.has(iso) ? colors.orange : planned ? colors.accent : colors.surface2 },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
});

const MonthView = React.memo(function MonthView({ today, done, colors, highlightDate }) {
  const ref = new Date(`${today}T12:00:00`);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthWorkoutCount = useMemo(() => [...done].filter(d => d.startsWith(monthPrefix)).length, [done, monthPrefix]);

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const total = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [year, month]);

  return (
    <View>
      <View style={styles.monthHeader}>
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
          <AppText key={d} muted style={styles.monthDayLabel}>{d}</AppText>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {days.map((date, i) => {
          if (!date) return <View key={`e${i}`} style={styles.monthCell} />;
          const iso = isoOf(date);
          const isToday = iso === today;
          const worked = done.has(iso);
          return (
            <View key={iso} style={styles.monthCell}>
              <Animated.View
                key={iso === highlightDate ? `highlight-${iso}` : iso}
                entering={iso === highlightDate ? heatmapEntrance : undefined}
                style={[
                  styles.monthDot,
                  worked && { backgroundColor: colors.orange },
                  isToday && !worked && { backgroundColor: colors.accent },
                ]}
              >
                <AppText
                  style={[
                    { fontSize: 11, fontWeight: '600' },
                    { color: worked ? (colors.dark ? '#fff' : '#000') : isToday ? colors.onAccent : colors.muted },
                  ]}
                >
                  {date.getDate()}
                </AppText>
              </Animated.View>
            </View>
          );
        })}
      </View>
      <AppText muted style={{ fontSize: 12, textAlign: 'center', marginTop: 6 }}>
        {MONTH_NAMES[month]} {year} · {monthWorkoutCount} {t('workouts')}
      </AppText>
    </View>
  );
});

const YearView = React.memo(function YearView({ today, done, colors, highlightDate }) {
  const year = new Date(`${today}T12:00:00`).getFullYear();
  const countPerDay = useMemo(() => {
    const map = {};
    done.forEach(iso => {
      if (iso.startsWith(year)) map[iso] = (map[iso] || 0) + 1;
    });
    return map;
  }, [done, year]);

  return (
    <View style={styles.yearGrid}>
      {MONTH_NAMES.map((name, mi) => {
        const daysInMonth = new Date(year, mi + 1, 0).getDate();
        return (
          <View key={name} style={styles.yearMonth}>
            <AppText muted style={{ fontSize: 10, fontWeight: '700', marginBottom: 3 }}>{name}</AppText>
            <View style={styles.yearDots}>
              {Array.from({ length: daysInMonth }, (_, d) => {
                const iso = `${year}-${String(mi + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}`;
                const worked = !!countPerDay[iso];
                const isToday = iso === today;
                return (
                  <Animated.View
                    key={iso === highlightDate ? `highlight-${iso}` : iso}
                    entering={iso === highlightDate ? heatmapEntrance : undefined}
                    style={[
                      styles.yearDot,
                      worked && { backgroundColor: colors.orange },
                      isToday && !worked && { backgroundColor: colors.accent },
                      !worked && !isToday && { backgroundColor: colors.surface2 },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        );
      })}
      <AppText muted style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
        {year} · {Object.keys(countPerDay).length} {t('workout days')}
      </AppText>
    </View>
  );
});

export default function ScheduleCard({
  calView,
  setCalView,
  weekDays,
  today,
  done,
  S,
  colors,
  setOverrideDay,
  highlightDate,
}) {
  return (
    <Card>
      <View style={styles.calHeader}>
        <AppText style={{ fontWeight: '700' }}>
          {calView === 'week'
            ? t('This week')
            : calView === 'month'
            ? `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`
            : String(new Date().getFullYear())}
        </AppText>
        <View style={styles.calTabs}>
          {['week', 'month', 'year'].map(v => (
            <Pressable
              key={v}
              accessibilityRole="tab"
              accessibilityLabel={v === 'week' ? t('This week') : v === 'month' ? t('This month') : t('This year')}
              accessibilityState={{ selected: calView === v }}
              onPress={() => setCalView(v)}
              style={({ pressed }) => [
                styles.calTab,
                calView === v && { backgroundColor: colors.accent },
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <AppText style={{ fontSize: 12, fontWeight: '700', color: calView === v ? colors.onAccent : colors.muted }}>
                {v === 'week' ? t('W') : v === 'month' ? t('M') : t('Y')}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
      {calView === 'week' && (
        <WeekView
          weekDays={weekDays}
          today={today}
          done={done}
          S={S}
          colors={colors}
          setOverrideDay={setOverrideDay}
          highlightDate={highlightDate}
        />
      )}
      {calView === 'month' && (
        <MonthView today={today} done={done} colors={colors} highlightDate={highlightDate} />
      )}
      {calView === 'year' && (
        <YearView today={today} done={done} colors={colors} highlightDate={highlightDate} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row' },
  day: { flex: 1, minWidth: 0, alignItems: 'center', gap: 5 },
  dayNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calTabs: { flexDirection: 'row', gap: 4 },
  calTab: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  monthHeader: { flexDirection: 'row', marginBottom: 4 },
  monthDayLabel: { flex: 1, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: '14.28%', alignItems: 'center', paddingVertical: 2 },
  monthDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  yearGrid: { gap: 8 },
  yearMonth: {},
  yearDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  yearDot: { width: 7, height: 7, borderRadius: 2 },
});
