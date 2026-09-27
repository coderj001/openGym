import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Chart from '../../components/Chart';
import Icon from '../../components/Icon';
import { AppText, Card } from '../../components/ui';
import { fmtNum } from '../../lib/format';
import { t } from '../../lib/i18n';

export default function VolumeCard({ volumePoints, unit, colors, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('View volume progress')} onPress={onPress}>
      <Card>
        <View style={styles.between}>
          <View>
            <AppText style={styles.cardTitle}>{t('Volume trend')}</AppText>
            <AppText muted style={{ fontSize: 12 }}>
              {t('Last 8 workouts')}
            </AppText>
          </View>
          <Icon name="chart-line" size={24} color={colors.accent} />
        </View>
        {volumePoints.length ? (
          <>
            <Chart points={volumePoints} unit={unit} height={90} />
            <AppText muted style={{ fontSize: 12 }}>
              {t('Latest')}: {fmtNum(volumePoints[volumePoints.length - 1].y)} {unit}
            </AppText>
          </>
        ) : (
          <AppText muted style={{ marginTop: 10 }}>
            {t('Finish a workout to track your training volume.')}
          </AppText>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 20, fontWeight: '800' },
});
