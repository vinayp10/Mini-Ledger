import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import LoanListScreen from './src/screens/LoanListScreen';
import AddLoanScreen from './src/screens/AddLoanScreen';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('Dashboard');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initializing MiniLedger...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const navigation = {
    navigate: (screen) => setCurrentScreen(screen),
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Screen Container */}
      <View style={styles.screenContainer}>
        {currentScreen === 'Dashboard' && <DashboardScreen navigation={navigation} />}
        {currentScreen === 'LoanList' && <LoanListScreen navigation={navigation} />}
        {currentScreen === 'AddLoan' && <AddLoanScreen navigation={navigation} />}
      </View>

      {/* Bottom Navigation Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentScreen('Dashboard')}
        >
          <Text style={[styles.tabIcon, currentScreen === 'Dashboard' && styles.tabActive]}>
            📊
          </Text>
          <Text style={[styles.tabLabel, currentScreen === 'Dashboard' && styles.tabActiveLabel]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentScreen('AddLoan')}
        >
          <Text style={[styles.tabIcon, currentScreen === 'AddLoan' && styles.tabActive]}>
            ➕
          </Text>
          <Text style={[styles.tabLabel, currentScreen === 'AddLoan' && styles.tabActiveLabel]}>
            Add Loan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentScreen('LoanList')}
        >
          <Text style={[styles.tabIcon, currentScreen === 'LoanList' && styles.tabActive]}>
            📑
          </Text>
          <Text style={[styles.tabLabel, currentScreen === 'LoanList' && styles.tabActiveLabel]}>
            Ledger
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    flex: 1,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.6,
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  tabActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  tabActiveLabel: {
    color: '#4f46e5',
    fontWeight: '700',
  },
});

