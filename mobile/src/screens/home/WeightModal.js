import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { AppText, Button, Input, useColors } from '../../components/ui';
import { t } from '../../lib/i18n';

export default function WeightModal({ visible, title, value, setValue, unit, close, save }) {
  const colors = useColors();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <AppText style={{ fontSize: 21, fontWeight: '800' }}>{title}</AppText>
          <Input autoFocus keyboardType="decimal-pad" value={value} onChangeText={setValue} />
          <AppText muted>{unit}</AppText>
          <Button title={t('Save')} primary onPress={save} />
          <Button title={t('Cancel')} onPress={close} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: 18, padding: 18, gap: 12 },
});
