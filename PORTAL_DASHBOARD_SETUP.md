# Portal Dashboard Setup

This document explains the new Portal Dashboard implementation and how to use it.

## Overview

The new `PortalDashboard` component is a modern, dark-themed financial dashboard inspired by the Aniq UI design. It features:

- **Dark Theme**: Modern dark color scheme with orange accents
- **Responsive Layout**: Sidebar navigation with main content area
- **Animations**: Smooth entrance animations using Framer Motion (web) and React Native Animated
- **Dashboard Cards**: Revenue, expenses, profit, and savings metrics
- **Charts**: Placeholders for revenue vs expenses and spending by category
- **Transactions**: Recent transactions list

## Installation

To use the new dashboard with full animations, install the required dependencies:

```bash
npm install framer-motion
```

For Tailwind CSS support (optional, for future enhancements):

```bash
npm install -D tailwindcss
```

## Usage

The dashboard is available as a new route in your navigation:

```javascript
navigation.navigate('PortalDashboard');
```

Or access it directly via URL (web):
```
http://localhost:8083/portal-dashboard
```

## Features

### Sidebar Navigation
- Logo at the top
- Navigation items: Overview, Your Cards, Analytics, Transactions, UI Components, Settings
- Active state highlighting with orange background

### Header Bar
- Logo and page title
- Country selector (US flag)
- Dark mode toggle
- Search icon
- Refresh icon
- Notifications with badge (shows "2")
- User profile with avatar

### Dashboard Metrics
Four metric cards displaying:
- Total Revenue: $284,382 (+12.5%)
- Total Expenses: $142,847 (-8.2%)
- Net Profit: $141,535 (+23.1%)
- Savings Rate: 49.7% (+5.3%)

### Charts Section
- Revenue vs Expenses chart with time period tabs (Daily, Weekly, Monthly, Yearly)
- Spending by Category donut chart with legend

### Transactions
Recent transactions list with:
- Transaction source/description
- Amount (color-coded: green for income, red for expenses)
- Transaction type
- Date

## Styling

The component uses React Native StyleSheet with Tailwind-inspired color palette:

- **Background**: `#1A1D29` (dark)
- **Surface**: `#252836` (cards, sidebar)
- **Border**: `#3A3F54`
- **Text**: `#FFFFFF` (primary), `#8B8F9E` (muted)
- **Accent**: `#FF6B35` (orange)

## Animations

The component includes smooth entrance animations:

- **Web**: Uses Framer Motion for animations
- **Native**: Uses React Native Animated API
- Cards fade in with a slight upward motion
- Staggered delays for sequential appearance

## Customization

To customize the dashboard:

1. **Metrics**: Edit the `metrics` array in the component
2. **Transactions**: Modify the `transactions` array
3. **Colors**: Update the color values in the `styles` StyleSheet
4. **Navigation**: Add/remove items from the `navItems` array

## Integration with Existing Portal

The new dashboard can coexist with the existing `PortalScreen`. To switch between them:

```javascript
// Use new dashboard
navigation.navigate('PortalDashboard');

// Use original portal
navigation.navigate('Portal');
```

## Future Enhancements

Potential improvements:
- Real chart implementations (using react-native-chart-kit or similar)
- Data fetching from API
- Interactive filters and date ranges
- Export functionality
- More detailed transaction views
- Real-time updates

## Notes

- The component is optimized for web but works on all platforms
- Framer Motion is optional - animations fall back to React Native Animated if not installed
- Chart placeholders can be replaced with actual chart libraries
- All data is currently mock data - integrate with your backend as needed
