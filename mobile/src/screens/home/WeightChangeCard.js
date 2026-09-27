import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from '../../components/Icon';
import { AppText, Card } from '../../components/ui';
import { fmtDate, fmtNum } from '../../lib/format';
import { t } from '../../lib/i18n';

export default function WeightChangeCard({ weightChange, unit, colors, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('View body weight progress')} onPress={onPress}>
      <Card>
        <View style={styles.between}>
          <View>
            <AppText style={styles.cardTitle}>{t('Body weight change')}</AppText>
            <AppText muted style={{ fontSize: 12 }}>
              {t('Last 30 days')}
            </AppText>
          </View>
          <Icon name="trending-up" size={24} color={colors.accent} />
        </View>
        {weightChange ? (
          weightChange.delta == null ? (
            <AppText muted style={{ marginTop: 12 }}>
              {t('Log another weigh-in to see your change.')}
            </AppText>
          ) : (
            <View style={styles.changeRow}>
              <View>
                <AppText style={{ fontSize: 30, fontWeight: '800', color: colors.accent }}>
                  {weightChange.delta > 0 ? '+' : ''}
                  {fmtNum(weightChange.delta)} {unit}
                </AppText>
                <AppText muted style={{ fontSize: 12 }}>
                  {fmtNum(weightChange.current.w)} {unit} · {fmtDate(weightChange.current.d, true)}
                </AppText>
              </View>
              <Icon
                name={weightChange.delta > 0 ? 'trending-up' : weightChange.delta < 0 ? 'trending-down' : 'minus'}
                size={30}
                color={colors.accent}
              />
            </View>
          )
        ) : (
          <AppText muted style={{ marginTop: 12 }}>
            {t('Log your body weight to start tracking change.')}
          </AppText>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 20, fontWeight: '800' },
  changeRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
});
