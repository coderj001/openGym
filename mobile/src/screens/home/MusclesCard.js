import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from '../../components/Icon';
import { AppText, Card, Progress } from '../../components/ui';
import { fmtNum } from '../../lib/format';
import { MUSCLE_NAME } from '../../lib/muscles';
import { t } from '../../lib/i18n';

export default function MusclesCard({ muscleBalance, muscleLoad, maxMuscleLoad, colors, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('View muscle balance')} onPress={onPress}>
      <Card>
        <View style={styles.between}>
          <View>
            <AppText style={styles.cardTitle}>{t('Muscle balance')}</AppText>
            <AppText muted style={{ fontSize: 12 }}>
              {t('Last 12 workouts · by sets worked')}
            </AppText>
          </View>
          <Icon name="arm-flex" size={25} color={colors.accent} />
        </View>
        {muscleBalance.worked.length ? (
          <View style={styles.muscleList}>
            {muscleBalance.worked.slice(0, 4).map(muscle => (
              <View key={muscle} style={styles.muscleRow}>
                <AppText style={{ width: 88, fontSize: 13 }}>{t(MUSCLE_NAME[muscle])}</AppText>
                <View style={{ flex: 1 }}>
                  <Progress value={muscleLoad[muscle] / maxMuscleLoad} />
                </View>
                <AppText muted style={{ width: 28, textAlign: 'right', fontSize: 12 }}>
                  {fmtNum(muscleLoad[muscle])}
                </AppText>
              </View>
            ))}
          </View>
        ) : (
          <AppText muted style={{ marginTop: 10 }}>
            {t('Finish a workout to see your training balance.')}
          </AppText>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 20, fontWeight: '800' },
  muscleList: { gap: 8, marginTop: 14 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
});
