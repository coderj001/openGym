import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from '../../components/Icon';
import { AppText, Card } from '../../components/ui';
import { t } from '../../lib/i18n';

export default function StreakCard({ streak, weekCount, totalWorkouts, colors }) {
  return (
    <Card>
      <View style={styles.between}>
        <View>
          <AppText style={{ fontSize: 21, fontWeight: '800' }}>🔥 {t('{0} week streak', streak)}</AppText>
          <AppText muted style={{ marginTop: 4 }}>
            {weekCount} {t('this week')} · {t('{0} workouts total', totalWorkouts)}
          </AppText>
        </View>
        <Icon name="calendar-month" size={28} color={colors.muted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
