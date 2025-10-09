/**
 * CurrencyAmount Component
 * Formats currency amounts (cents to dollars)
 */

import { Text } from 'react-native';

export default function CurrencyAmount({ amount, currency = 'usd', style }) {
  const formatCurrency = (cents, curr) => {
    const dollars = cents / 100;
    const currencyCode = curr.toUpperCase();

    return `$${dollars.toFixed(2)} ${currencyCode}`;
  };

  return (
    <Text style={style}>
      {formatCurrency(amount, currency)}
    </Text>
  );
}
