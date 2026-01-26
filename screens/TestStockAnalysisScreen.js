/**
 * Test Screen for Stock Analysis API
 * 
 * This screen allows you to test the data analyst's API endpoint
 * directly from the app UI.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';

// Direct fetch to /api/analyze endpoint

export default function TestStockAnalysisScreen() {
  const [handle, setHandle] = useState('@rubicon59');
  const [months, setMonths] = useState('12');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [validationResults, setValidationResults] = useState(null);

  // Expected response structure
  const expectedFields = ['id', 'url', 'created_at', 'cashtag', 'text', 'begin', 'return', 'last', 'alpha'];

  const validateResponse = (data) => {
    const results = {
      isValid: true,
      isArray: Array.isArray(data),
      itemCount: Array.isArray(data) ? data.length : 0,
      validItems: 0,
      invalidItems: 0,
      issues: [],
      summary: {},
    };

    if (!Array.isArray(data)) {
      results.isValid = false;
      results.issues.push('Response is not an array');
      return results;
    }

    // Validate each item
    data.forEach((item, index) => {
      const missingFields = [];
      const wrongTypes = [];

      expectedFields.forEach(field => {
        if (!(field in item)) {
          missingFields.push(field);
        } else {
          const value = item[field];
          if (field === 'cashtag' && !Array.isArray(value)) {
            wrongTypes.push(`${field} should be array`);
          } else if (['id', 'url', 'created_at', 'text'].includes(field) && typeof value !== 'string') {
            wrongTypes.push(`${field} should be string`);
          } else if (['begin', 'return', 'last', 'alpha'].includes(field) && typeof value !== 'number') {
            wrongTypes.push(`${field} should be number`);
          }
        }
      });

      if (missingFields.length > 0 || wrongTypes.length > 0) {
        results.invalidItems++;
        results.issues.push({
          index,
          missingFields,
          wrongTypes,
        });
      } else {
        results.validItems++;
      }
    });

    // Calculate summary
    const allCashtags = new Set();
    let withNonZeroValues = 0;
    
    data.forEach(item => {
      if (Array.isArray(item.cashtag)) {
        item.cashtag.forEach(tag => allCashtags.add(tag));
      }
      if (item.begin !== 0 || item.return !== 0 || item.last !== 0 || item.alpha !== 0) {
        withNonZeroValues++;
      }
    });

    results.summary = {
      uniqueCashtags: allCashtags.size,
      cashtags: Array.from(allCashtags),
      withNonZeroValues,
    };

    results.isValid = results.invalidItems === 0;
    return results;
  };

  const handleTest = async () => {
    if (!handle.trim()) {
      Alert.alert('Error', 'Please enter a Twitter handle');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setValidationResults(null);

    try {
      const cleanHandle = handle.replace(/^@/, '').trim();
      const monthsNum = months ? parseInt(months, 10) : 12;

      console.log(`[Test] Testing /api/analyze with handle: ${cleanHandle}, months: ${monthsNum}`);

      // Make request to backend proxy /api/analyze
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          handle: cleanHandle, 
          months: monthsNum 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(errorData.message || `API error ${response.status}`);
      }

      const data = await response.json();

      setResponse(data);
      const validation = validateResponse(data);
      setValidationResults(validation);

      console.log('[Test] Response received:', data);
      console.log('[Test] Validation:', validation);

    } catch (err) {
      let errorMessage = 'An error occurred';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('[Test] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatJSON = (obj) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return String(obj);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Test Analysis API</Text>
        <Text style={styles.subtitle}>
          Test the /api/analyze endpoint with a Twitter handle
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Twitter Handle *</Text>
          <TextInput
            style={styles.input}
            value={handle}
            onChangeText={setHandle}
            placeholder="@username"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Months (optional)</Text>
          <TextInput
            style={styles.input}
            value={months}
            onChangeText={setMonths}
            placeholder="12"
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleTest}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Test Endpoint</Text>
            )}
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>❌ Error</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {validationResults && (
          <View style={styles.validationContainer}>
            <Text style={styles.sectionTitle}>Validation Results</Text>
            <View style={styles.validationItem}>
              <Text style={styles.validationLabel}>Is Array:</Text>
              <Text style={styles.validationValue}>
                {validationResults.isArray ? '✅ Yes' : '❌ No'}
              </Text>
            </View>
            <View style={styles.validationItem}>
              <Text style={styles.validationLabel}>Item Count:</Text>
              <Text style={styles.validationValue}>{validationResults.itemCount}</Text>
            </View>
            <View style={styles.validationItem}>
              <Text style={styles.validationLabel}>Valid Items:</Text>
              <Text style={styles.validationValue}>
                {validationResults.validItems} / {validationResults.itemCount}
              </Text>
            </View>
            {validationResults.summary.uniqueCashtags > 0 && (
              <View style={styles.validationItem}>
                <Text style={styles.validationLabel}>Unique Tickers:</Text>
                <Text style={styles.validationValue}>
                  {validationResults.summary.cashtags.join(', ')}
                </Text>
              </View>
            )}
            {validationResults.issues.length > 0 && (
              <View style={styles.issuesContainer}>
                <Text style={styles.issuesTitle}>Issues Found:</Text>
                {validationResults.issues.slice(0, 5).map((issue, idx) => (
                  <Text key={idx} style={styles.issueText}>
                    Item {issue.index}: {issue.missingFields.join(', ')} {issue.wrongTypes.join(', ')}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {response && (
          <View style={styles.responseContainer}>
            <Text style={styles.sectionTitle}>Response Data</Text>
            <ScrollView 
              style={styles.jsonContainer}
              nestedScrollEnabled={true}
            >
              <Text style={styles.jsonText} selectable>
                {formatJSON(response).substring(0, 5000)}
                {formatJSON(response).length > 5000 && '\n... (truncated)'}
              </Text>
            </ScrollView>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1A1D29',
  },
  subtitle: {
    fontSize: 14,
    color: '#8B8F9E',
    marginBottom: 24,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1A1D29',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  button: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
  },
  validationContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1A1D29',
  },
  validationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  validationLabel: {
    fontSize: 14,
    color: '#8B8F9E',
  },
  validationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1D29',
  },
  issuesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  issuesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 8,
  },
  issueText: {
    fontSize: 12,
    color: '#C62828',
    marginBottom: 4,
  },
  responseContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  jsonContainer: {
    maxHeight: 400,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 12,
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#1A1D29',
  },
});
