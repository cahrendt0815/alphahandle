import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { checkHealth, getDividends, DividendRow } from '../lib/api';
import { getBaseUrl } from '../lib/config';

export default function HealthAndAAPL() {
  const [health, setHealth] = useState<string>('checking…');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DividendRow[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkHealth()
      .then(r => setHealth(r.status))
      .catch(e => setHealth('error: ' + (e as Error).message));
  }, []);

  const loadDivs = async () => {
    setError(''); setLoading(true);
    try {
      const rows = await getDividends('AAPL');
      setData(rows.slice(-20).reverse()); // show recent 20
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Backend: {getBaseUrl()}</Text>
        <Text style={styles.healthText}>Health: {health}</Text>
        <Button title="Load AAPL Dividends" onPress={loadDivs} />
        {loading && <ActivityIndicator style={styles.loader} />}
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {data.length > 0 && (
          <View style={styles.dividendList}>
            {data.map((item) => (
              <Text key={item.date} style={styles.dividendItem}>
                {item.date} — ${item.amount.toFixed(2)}
              </Text>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  healthText: {
    fontSize: 16,
    marginBottom: 8,
  },
  loader: {
    marginVertical: 16,
  },
  errorText: {
    color: 'red',
    marginVertical: 8,
  },
  dividendList: {
    marginTop: 16,
  },
  dividendItem: {
    fontSize: 14,
    paddingVertical: 4,
  },
});
