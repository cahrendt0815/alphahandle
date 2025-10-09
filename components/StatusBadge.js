/**
 * StatusBadge Component
 * Displays invoice/subscription status with color-coded badges
 */

import { StyleSheet, Text, View } from 'react-native';

export default function StatusBadge({ status }) {
  const getStatusStyle = () => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return styles.statusPaid;
      case 'open':
        return styles.statusOpen;
      case 'void':
      case 'canceled':
      case 'cancelled':
        return styles.statusVoid;
      case 'active':
        return styles.statusActive;
      case 'trialing':
        return styles.statusTrialing;
      default:
        return styles.statusDefault;
    }
  };

  const getStatusText = () => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'Paid';
      case 'open':
        return 'Open';
      case 'void':
        return 'Void';
      case 'canceled':
      case 'cancelled':
        return 'Canceled';
      case 'active':
        return 'Active';
      case 'trialing':
        return 'Trial';
      default:
        return status || 'Unknown';
    }
  };

  return (
    <View style={[styles.badge, getStatusStyle()]}>
      <Text style={styles.badgeText}>{getStatusText()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusPaid: {
    backgroundColor: '#D1FAE5',
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusTrialing: {
    backgroundColor: '#DBEAFE',
  },
  statusOpen: {
    backgroundColor: '#FEF3C7',
  },
  statusVoid: {
    backgroundColor: '#FEE2E2',
  },
  statusDefault: {
    backgroundColor: '#F3F4F6',
  },
});
