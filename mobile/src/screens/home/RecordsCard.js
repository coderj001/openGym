import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from '../../components/Icon';
import { AppText, Card } from '../../components/ui';
import { EXIDX } from '../../lib/exercises';
import { fmtDate, fmtNum } from '../../lib/format';
import { t } from '../../lib/i18n';

export default function RecordsCard({ records, unit, colors, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('View exercise progress')} onPress={onPress}>
      <Card>
        <View style={styles.between}>
          <AppText style={styles.cardTitle}>{t('Personal records')}</AppText>
          <Icon name="trophy" size={24} color={colors.accent} />
        </View>
        {records.length ? (
          records.map(({ id, record }) => (
            <View key={id} style={[styles.recordRow, { borderTopColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontWeight: '800' }}>{EXIDX[id]?.n || t('Unknown exercise')}</AppText>
                <AppText muted style={{ fontSize: 12 }}>
                  {fmtNum(record.w)} × {record.r} · {fmtDate(record.d, true)}
                </AppText>
              </View>
              <AppText style={{ color: colors.accent, fontWeight: '800' }}>
                {fmtNum(record.est)} {unit}
              </AppText>
            </View>
          ))
        ) : (
          <AppText muted style={{ marginTop: 10 }}>
            {t('Finish reps-based sets to start tracking records.')}
          </AppText>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 20, fontWeight: '800' },
  recordRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8 },
});
