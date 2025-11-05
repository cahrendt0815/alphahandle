import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ScrollView
} from 'react-native';
import { getFilteredTweetsForHandle } from '../services/handleSearch';
import type { Tweet } from '../types/twitter';

export default function SearchScreen() {
  const [handle, setHandle] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [scanned, setScanned] = useState<number>(0);
  const [error, setError] = useState<string>('');

  const handleSearch = async () => {
    if (!handle.trim()) {
      setError('Please enter a Twitter handle');
      return;
    }

    setError('');
    setLoading(true);
    setTweets([]);
    setScanned(0);

    try {
      const result = await getFilteredTweetsForHandle(handle, { maxCount: 50 });
      setTweets(result.kept);
      setScanned(result.scanned);
    } catch (e) {
      setError((e as Error).message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Search Twitter Handle</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter handle (e.g., elonmusk)"
          value={handle}
          onChangeText={setHandle}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Button title="Search" onPress={handleSearch} disabled={loading} />

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Searching tweets...</Text>
          </View>
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && tweets.length > 0 && (
          <View style={styles.results}>
            <Text style={styles.resultsText}>
              Scanned {scanned} tweets, kept {tweets.length} with stock mentions
            </Text>

            <View style={styles.tweetList}>
              {tweets.map((tweet) => (
                <View key={tweet.id} style={styles.tweetItem}>
                  <Text style={styles.tweetText}>{tweet.text}</Text>
                  {tweet.created_at && (
                    <Text style={styles.tweetDate}>
                      {new Date(tweet.created_at).toLocaleString()}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {!loading && scanned > 0 && tweets.length === 0 && (
          <Text style={styles.noResults}>No stock mentions found in {scanned} tweets</Text>
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
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: 'red',
    marginVertical: 12,
    fontSize: 14,
  },
  results: {
    marginTop: 16,
  },
  resultsText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  tweetList: {
    gap: 12,
  },
  tweetItem: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#635BFF',
  },
  tweetText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  tweetDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  noResults: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 24,
  },
});