/**
 * ComparisonTable Component
 * Feature comparison across all plans
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';

const CheckIcon = () => <Text style={styles.checkIcon}>✓</Text>;
const CrossIcon = () => <Text style={styles.crossIcon}>✗</Text>;
const SoonChip = () => (
  <View style={styles.soonChip}>
    <Text style={styles.soonText}>Soon</Text>
  </View>
);

export default function ComparisonTable() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const features = [
    {
      name: 'Searches per month',
      ape: '5',
      degen: '10',
      gigachad: '50',
    },
    {
      name: 'Timeline limit',
      ape: '12 mo',
      degen: '24 mo',
      gigachad: 'Unlimited',
    },
    {
      name: 'Recent Recommendations (full list)',
      ape: <CrossIcon />,
      degen: <CheckIcon />,
      gigachad: <CheckIcon />,
    },
    {
      name: 'Full performance metrics',
      ape: <CheckIcon />,
      degen: <CheckIcon />,
      gigachad: <CheckIcon />,
    },
    {
      name: 'Best & Worst trades',
      ape: <CheckIcon />,
      degen: <CheckIcon />,
      gigachad: <CheckIcon />,
    },
    {
      name: 'Export history (CSV)',
      ape: <CrossIcon />,
      degen: <CrossIcon />,
      gigachad: <CheckIcon />,
    },
    {
      name: 'Alerts (coming soon)',
      ape: <SoonChip />,
      degen: <SoonChip />,
      gigachad: <SoonChip />,
    },
    {
      name: 'API access (coming soon)',
      ape: <CrossIcon />,
      degen: <SoonChip />,
      gigachad: <CheckIcon />,
    },
    {
      name: 'Priority compute',
      ape: <CrossIcon />,
      degen: <CrossIcon />,
      gigachad: <CheckIcon />,
    },
    {
      name: 'Support',
      ape: 'Email',
      degen: 'Priority Email',
      gigachad: (
        <View>
          <Text style={styles.cellText}>Priority + Slack</Text>
          <Text style={styles.cellSubtext}>(Soon)</Text>
        </View>
      ),
    },
  ];

  if (isMobile) {
    // Mobile: Stacked layout
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.mobileContainer}>
          <View style={styles.mobileTable}>
            {/* Header Row */}
            <View style={styles.mobileHeaderRow}>
              <View style={styles.mobileHeaderCell}>
                <Text style={styles.mobileHeaderText}>Feature</Text>
              </View>
              <View style={styles.mobileHeaderCell}>
                <Text style={styles.mobileHeaderText}>Ape</Text>
              </View>
              <View style={styles.mobileHeaderCell}>
                <Text style={styles.mobileHeaderText}>Degen</Text>
              </View>
              <View style={styles.mobileHeaderCell}>
                <Text style={styles.mobileHeaderText}>GigaChad</Text>
              </View>
            </View>

            {/* Feature Rows */}
            {features.map((feature, idx) => (
              <View
                key={idx}
                style={[styles.mobileRow, idx % 2 === 0 && styles.mobileRowZebra]}
              >
                <View style={styles.mobileFeatureCell}>
                  <Text style={styles.featureName}>{feature.name}</Text>
                </View>
                <View style={styles.mobileCell}>
                  {typeof feature.ape === 'string' ? (
                    <Text style={styles.cellText}>{feature.ape}</Text>
                  ) : (
                    feature.ape
                  )}
                </View>
                <View style={styles.mobileCell}>
                  {typeof feature.degen === 'string' ? (
                    <Text style={styles.cellText}>{feature.degen}</Text>
                  ) : (
                    feature.degen
                  )}
                </View>
                <View style={styles.mobileCell}>
                  {typeof feature.gigachad === 'string' ? (
                    <Text style={styles.cellText}>{feature.gigachad}</Text>
                  ) : (
                    feature.gigachad
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  // Desktop: Full table
  return (
    <View style={styles.container}>
      <View style={styles.table}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={[styles.headerCell, styles.featureColumn]}>
            <Text style={styles.headerText}>Feature</Text>
          </View>
          <View style={styles.headerCell}>
            <Text style={styles.headerText}>Ape</Text>
          </View>
          <View style={styles.headerCell}>
            <Text style={styles.headerText}>Degen</Text>
          </View>
          <View style={styles.headerCell}>
            <Text style={styles.headerText}>GigaChad</Text>
          </View>
        </View>

        {/* Feature Rows */}
        {features.map((feature, idx) => (
          <View key={idx} style={[styles.row, idx % 2 === 0 && styles.rowZebra]}>
            <View style={[styles.cell, styles.featureColumn]}>
              <Text style={styles.featureName}>{feature.name}</Text>
            </View>
            <View style={styles.cell}>
              {typeof feature.ape === 'string' ? (
                <Text style={styles.cellText}>{feature.ape}</Text>
              ) : (
                feature.ape
              )}
            </View>
            <View style={styles.cell}>
              {typeof feature.degen === 'string' ? (
                <Text style={styles.cellText}>{feature.degen}</Text>
              ) : (
                feature.degen
              )}
            </View>
            <View style={styles.cell}>
              {typeof feature.gigachad === 'string' ? (
                <Text style={styles.cellText}>{feature.gigachad}</Text>
              ) : (
                feature.gigachad
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  table: {
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f7f8fb',
    borderBottomWidth: 2,
    borderBottomColor: '#E3E8EF',
  },
  headerCell: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b0b0c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
  },
  rowZebra: {
    backgroundColor: '#fafbfc',
  },
  cell: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureColumn: {
    flex: 1.5,
    alignItems: 'flex-start',
  },
  featureName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0b0b0c',
  },
  cellText: {
    fontSize: 15,
    color: '#4b5563',
    fontWeight: '500',
    textAlign: 'center',
  },
  cellSubtext: {
    fontSize: 12,
    color: '#9aa3af',
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 20,
    color: '#00D924',
    fontWeight: '700',
  },
  crossIcon: {
    fontSize: 20,
    color: '#E3E8EF',
    fontWeight: '700',
  },
  soonChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  soonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },

  // Mobile styles
  mobileContainer: {
    minWidth: 700,
  },
  mobileTable: {
    borderWidth: 1,
    borderColor: '#E3E8EF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mobileHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f7f8fb',
    borderBottomWidth: 2,
    borderBottomColor: '#E3E8EF',
  },
  mobileHeaderCell: {
    width: 160,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0b0b0c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mobileRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
  },
  mobileRowZebra: {
    backgroundColor: '#fafbfc',
  },
  mobileFeatureCell: {
    width: 160,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  mobileCell: {
    width: 160,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
