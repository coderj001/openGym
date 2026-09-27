import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { FieldGroup, Host, Switch } from '@expo/ui';
import Icon from '../../components/Icon';
import { Header, IconButton, Screen, useColors } from '../../components/ui';
import { t } from '../../lib/i18n';

export default function HomeEditor({ visible, close, widgetIds, toggleWidget, moveWidget, homeWidgets }) {
  const colors = useColors();
  const shownWidgets = widgetIds.map(id => homeWidgets.find(widget => widget.id === id)).filter(Boolean);
  const hiddenWidgets = homeWidgets.filter(widget => !widgetIds.includes(widget.id));
  const renderWidget = (widget, shown) => {
    const position = widgetIds.indexOf(widget.id);
    return (
      <View key={widget.id} style={styles.widgetRow}>
        <View style={[styles.widgetIcon, { backgroundColor: colors.surface2 }]}>
          <Icon name={widget.icon} size={20} color={colors.accent} />
        </View>
        <View style={styles.widgetSwitch}>
          <Switch
            testID={`home-widget-${widget.id}`}
            label={t(widget.title)}
            value={shown}
            onValueChange={() => toggleWidget(widget.id)}
          />
        </View>
        {shown ? (
          <View style={styles.widgetActions}>
            <IconButton
              name="arrowUp"
              disabled={position === 0}
              onPress={() => moveWidget(widget.id, -1)}
              accessibilityLabel={`${t('Previous')} ${t(widget.title)}`}
            />
            <IconButton
              name="arrowDown"
              disabled={position === widgetIds.length - 1}
              onPress={() => moveWidget(widget.id, 1)}
              accessibilityLabel={`${t('Next')} ${t(widget.title)}`}
            />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <Screen scroll={false} contentStyle={{ paddingBottom: 0, gap: 0 }}>
        <Header title={`${t('Edit')} ${t('Home')}`} left={<IconButton name="close" onPress={close} />} />
        <Host style={{ flex: 1, backgroundColor: colors.bg }} colorScheme={colors.dark ? 'dark' : 'light'} seedColor={colors.accent} useViewportSizeMeasurement>
          <FieldGroup style={{ flex: 1, backgroundColor: colors.bg }} testID="home-widget-list">
            <FieldGroup.Section title={t('Visible widgets')}>
              {shownWidgets.map(widget => renderWidget(widget, true))}
            </FieldGroup.Section>
            {hiddenWidgets.length ? (
              <FieldGroup.Section title={t('Hidden widgets')}>
                {hiddenWidgets.map(widget => renderWidget(widget, false))}
              </FieldGroup.Section>
            ) : null}
          </FieldGroup>
        </Host>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  widgetRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 8 },
  widgetIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  widgetSwitch: { flex: 1, minWidth: 0 },
  widgetActions: { flexDirection: 'row', gap: 12 },
});
