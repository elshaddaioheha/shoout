import { router } from 'expo-router';
import React from 'react';
import { FallbackProps } from 'react-error-boundary';
import { Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function FallbackErrorScreen({ error, resetErrorBoundary }: FallbackProps) {
  const handleReset = () => {
    resetErrorBoundary();
    if (Platform.OS !== 'web') {
      try {
        router.replace('/');
      } catch (e) {
        // ignore
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Oops! Something went wrong.</Text>
        <Text style={styles.message}>
          {error instanceof Error ? error.message : String(error) || 'An unexpected error occurred.'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleReset}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
  },
  buttonText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    fontSize: 16,
    textAlign: 'center',
  },
});