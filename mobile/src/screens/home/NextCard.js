import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from '../../components/Icon';
import { AppText, Button, Card } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { t } from '../../lib/i18n';

export default function NextCard({ nextWorkout, colors, onStart, onPlan }) {
  return (
    <Card>
      <View style={styles.between}>
        <View>
          <AppText style={styles.cardTitle}>{t('Next workout')}</AppText>
          <AppText muted style={{ fontSize: 12 }}>
            {nextWorkout ? fmtDate(nextWorkout.d, true) : t('No workout scheduled')}
          </AppText>
        </View>
        <Icon name="calendar-arrow-right" size={24} color={colors.accent} />
      </View>
      {nextWorkout ? (
        <View style={[styles.nextRow, { borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <AppText style={{ fontWeight: '800' }}>{nextWorkout.routine.name}</AppText>
            <AppText muted style={{ fontSize: 12 }}>
              {nextWorkout.routine.ex.length} {t('exercises')}
            </AppText>
          </View>
          <Button
            compact
            primary
            title={t('Start')}
            onPress={() => onStart(nextWorkout.routine.id)}
          />
        </View>
      ) : (
        <Button compact title={t('Plan workouts')} onPress={onPlan} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 20, fontWeight: '800' },
  nextRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 10 },
});
