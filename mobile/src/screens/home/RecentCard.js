import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from '../../components/Icon';
import { AppText, Card } from '../../components/ui';
import { fmtDate, fmtNum } from '../../lib/format';
import { workoutVolume } from '../../lib/history';
import { t } from '../../lib/i18n';

export default function RecentCard({ recentWorkouts, unit, colors, onSelectWorkout }) {
  return (
    <Card>
      <View style={styles.between}>
        <AppText style={styles.cardTitle}>{t('Recent workouts')}</AppText>
        <Icon name="history" size={24} color={colors.accent} />
      </View>
      {recentWorkouts.length ? (
        recentWorkouts.map(workout => (
          <Pressable
            key={workout.id}
            accessibilityRole="button"
            accessibilityLabel={`${workout.name}, ${fmtDate(workout.d, true)}`}
            onPress={() => onSelectWorkout(workout.id)}
            style={({ pressed }) => [
              styles.recentRow,
              { borderTopColor: colors.border, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText style={{ fontWeight: '800' }}>{workout.name}</AppText>
              <AppText muted style={{ fontSize: 12 }}>
                {fmtDate(workout.d, true)} · {workout.entries.length} {t('exercises')}
              </AppText>
            </View>
            <AppText style={{ color: colors.accent, fontWeight: '800' }}>
              {fmtNum(workoutVolume(workout))} {unit}
            </AppText>
            <Icon name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
        ))
      ) : (
        <AppText muted style={{ marginTop: 10 }}>
          {t('Your finished workouts will appear here.')}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 20, fontWeight: '800' },
  recentRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 8 },
});
