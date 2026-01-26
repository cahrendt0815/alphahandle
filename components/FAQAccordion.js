/**
 * FAQAccordion Component
 * Expandable FAQ items
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const FAQItem = ({ question, answer, isOpen, onToggle }) => {
  return (
    <View style={styles.item}>
      <TouchableOpacity
        style={styles.questionContainer}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.question}>{question}</Text>
        <Text style={styles.icon}>{isOpen ? '−' : '+'}</Text>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.answerContainer}>
          <Text style={styles.answer}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

export default function FAQAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <FAQItem
          key={index}
          question={item.question}
          answer={item.answer}
          isOpen={openIndex === index}
          onToggle={() => handleToggle(index)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 800,
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8EF',
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 0,
  },
  question: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#0b0b0c',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
    fontWeight: '300',
    color: '#4b5563',
    width: 24,
    textAlign: 'center',
  },
  answerContainer: {
    paddingBottom: 24,
    paddingRight: 40,
  },
  answer: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 26,
  },
});
