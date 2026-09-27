import React from 'react';
import { StyleSheet, View } from 'react-native';
import Chart from '../../components/Chart';
import { AppText, Button, Card } from '../../components/ui';
import { fmtDate, fmtNum } from '../../lib/format';
import { t } from '../../lib/i18n';

export default function BodyweightCard({ bw, targetW, unit, bodyweight = [], openWeight }) {
  return (
    <Card>
      <View style={styles.between}>
        <AppText style={{ fontSize: 20, fontWeight: '800' }}>{t('Body weight')}</AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button compact title={targetW ? fmtNum(targetW) : t('Goal')} onPress={() => openWeight(true)} />
          <Button compact title={t('Log')} icon="plus" onPress={() => openWeight(false)} />
        </View>
      </View>
      {bw ? (
        <>
          <AppText style={{ fontSize: 30, fontWeight: '800', marginTop: 10 }}>
            {fmtNum(bw.w)} <AppText muted>{unit}</AppText>
          </AppText>
          <AppText dim style={{ fontSize: 12 }}>
            {fmtDate(bw.d, true)}
            {targetW ? ` · ${t('Goal')} ${fmtNum(targetW)} ${unit}` : ''}
          </AppText>
          <Chart points={bodyweight.slice(-30).map(item => ({ y: item.w }))} unit={unit} height={120} />
        </>
      ) : (
        <AppText muted style={{ marginTop: 12 }}>
          {t('No entries yet — log your weight to start the curve.')}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
