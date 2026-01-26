// Themed StyleSheet styles for clean SaaS dashboard
import { StyleSheet, Platform } from 'react-native';
import { colors, radii, spacing, textSizes, shadow } from './tokens';

export const appStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
});

export const card = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 10px 30px rgba(17,24,39,0.06)' } as any)
      : shadow.card),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: textSizes.h3,
    fontWeight: '600',
    color: colors.text,
  },
});

export const stat = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 10px 30px rgba(17,24,39,0.06)' } as any)
      : shadow.card),
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99,91,255,0.10)', // brand tint
  },
  label: {
    fontSize: textSizes.xs,
    textTransform: 'uppercase',
    color: colors.muted,
    letterSpacing: 0.5
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  trend: {
    fontSize: textSizes.xs,
    color: colors.brand,
    marginLeft: 6
  },
});

export const toolbar = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 10px 30px rgba(17,24,39,0.06)' } as any)
      : shadow.card),
  },
});

export const sidebarItem = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  active: {
    backgroundColor: 'rgba(99,91,255,0.10)',
  },
  activeText: {
    color: colors.brand,
  },
  text: {
    color: colors.text,
    fontSize: 14,
  },
});

export const button = StyleSheet.create({
  primary: {
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 10px 30px rgba(17,24,39,0.06)' } as any)
      : shadow.card),
  },
  primaryText: {
    color: '#ffffff',
    fontSize: textSizes.base,
    fontWeight: '600',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.text,
    fontSize: textSizes.base,
    fontWeight: '600',
  },
});

export const table = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  headerRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  headerText: {
    fontSize: textSizes.xs,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cell: {
    fontSize: textSizes.base,
    color: colors.text,
  },
});
