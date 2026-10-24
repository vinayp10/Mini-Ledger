import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen({ navigation }) {
  const [summary, setSummary] = useState({
    totalLent: 0,
    totalRepaid: 0,
    overdueAmount: 0,
    totalEntries: 0,
    overdueEntries: 0,
  });
  const [recentLoans, setRecentLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { logout, user } = useAuth();

  const loadData = async () => {
    try {
      const [sumRes, loansRes] = await Promise.all([
        client.get('/loans/summary'),
        client.get('/loans'),
      ]);

      const sumData = sumRes.data?.data || sumRes.data || {};
      setSummary({
        totalLent: Number(sumData.totalLent) || 0,
        totalRepaid: Number(sumData.totalRepaid) || 0,
        overdueAmount: Number(sumData.overdueAmount) || 0,
        totalEntries: Number(sumData.totalEntries ?? sumData.totalLoans) || 0,
        overdueEntries: Number(sumData.overdueEntries ?? sumData.overdueLoans) || 0,
      });

      const listData = Array.isArray(loansRes.data?.data)
        ? loansRes.data.data
        : Array.isArray(loansRes.data)
        ? loansRes.data
        : [];
      setRecentLoans(listData);
    } catch (err) {
      console.warn('Error fetching dashboard', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleMarkRepaid = async (id) => {
    try {
      await client.patch(`/loans/${id}/repay`);
      Alert.alert('Success', 'Loan marked as repaid!');
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update loan');
    }
  };

  const getStatus = (item) => {
    if (item.status === 'repaid') return 'repaid';
    if (item.status === 'overdue') return 'overdue';
    if (item.dueDate && new Date(item.dueDate) < new Date()) return 'overdue';
    return 'pending';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading ledger summary...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>MiniLedger</Text>
          <Text style={styles.userPhone}>📱 +91 {user?.phone || 'User'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Card (Image Requirement: summary card at the top) */}
      <View style={styles.summaryContainer}>
        <Text style={styles.sectionTitle}>Summary Overview</Text>

        <View style={styles.summaryGrid}>
          {/* Total Lent */}
          <View style={[styles.card, styles.cardBlue]}>
            <Text style={styles.cardLabel}>TOTAL LENT</Text>
            <Text style={styles.cardAmount}>₹{summary.totalLent.toLocaleString('en-IN')}</Text>
            <Text style={styles.cardSub}>{summary.totalEntries} loans recorded</Text>
          </View>

          {/* Total Repaid */}
          <View style={[styles.card, styles.cardGreen]}>
            <Text style={styles.cardLabel}>TOTAL REPAID</Text>
            <Text style={styles.cardAmount}>₹{summary.totalRepaid.toLocaleString('en-IN')}</Text>
            <Text style={styles.cardSub}>Recovered & settled</Text>
          </View>

          {/* Overdue Amount (Highlighted) */}
          <View style={[styles.card, styles.cardRed]}>
            <Text style={styles.cardLabel}>OVERDUE AMOUNT</Text>
            <Text style={styles.cardAmount}>₹{summary.overdueAmount.toLocaleString('en-IN')}</Text>
            <Text style={styles.cardSub}>{summary.overdueEntries} overdue loans</Text>
          </View>
        </View>
      </View>

      {/* Quick Add Button */}
      <TouchableOpacity
        style={styles.addLoanBtn}
        onPress={() => navigation?.navigate?.('AddLoan')}
      >
        <Text style={styles.addLoanBtnText}>+ Add New Loan Entry</Text>
      </TouchableOpacity>

      {/* Entries List with Overdue Ones Highlighted */}
      <View style={styles.listSection}>
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Loan Entries</Text>
          <TouchableOpacity onPress={() => navigation?.navigate?.('LoanList')}>
            <Text style={styles.viewAllText}>View All ({recentLoans.length}) →</Text>
          </TouchableOpacity>
        </View>

        {recentLoans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No loan records found.</Text>
            <Text style={styles.emptySub}>Tap '+ Add New Loan Entry' to record your first loan.</Text>
          </View>
        ) : (
          recentLoans.slice(0, 5).map((loan) => {
            const status = getStatus(loan);
            const isOverdue = status === 'overdue';
            const isRepaid = status === 'repaid';

            return (
              <View
                key={loan._id}
                style={[
                  styles.entryCard,
                  isOverdue && styles.entryOverdue, // Highlighted in RED
                  isRepaid && styles.entryRepaid,
                ]}
              >
                <View style={styles.entryRow}>
                  <View style={styles.entryLeft}>
                    <Text style={styles.friendName}>{loan.friendName}</Text>
                    <Text style={styles.entryDate}>
                      Due: {new Date(loan.dueDate).toLocaleDateString('en-GB')}
                    </Text>
                    {loan.notes ? (
                      <Text style={styles.entryNotes} numberOfLines={1}>
                        {loan.notes}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.entryRight}>
                    <Text style={styles.amount}>₹{Number(loan.amount).toLocaleString('en-IN')}</Text>
                    <View
                      style={[
                        styles.badge,
                        isOverdue && styles.badgeOverdue,
                        isRepaid && styles.badgeRepaid,
                        status === 'pending' && styles.badgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isOverdue && styles.badgeTextOverdue,
                          isRepaid && styles.badgeTextRepaid,
                          status === 'pending' && styles.badgeTextPending,
                        ]}
                      >
                        {status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {status !== 'repaid' && (
                  <TouchableOpacity
                    style={styles.repayBtn}
                    onPress={() => handleMarkRepaid(loan._id)}
                  >
                    <Text style={styles.repayBtnText}>✓ Mark Repaid</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  userPhone: {
    fontSize: 13,
    color: '#64748b',
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 12,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  summaryGrid: {
    gap: 12,
  },
  card: {
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardBlue: {
    backgroundColor: '#4f46e5',
  },
  cardGreen: {
    backgroundColor: '#059669',
  },
  cardRed: {
    backgroundColor: '#dc2626',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    opacity: 0.85,
    letterSpacing: 0.5,
  },
  cardAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginVertical: 4,
  },
  cardSub: {
    fontSize: 11,
    color: '#ffffff',
    opacity: 0.8,
  },
  addLoanBtn: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 14,
    elevation: 2,
  },
  addLoanBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  listSection: {
    marginBottom: 30,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewAllText: {
    fontSize: 13,
    color: '#4f46e5',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  entryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  entryOverdue: {
    borderLeftWidth: 6,
    borderLeftColor: '#ef4444',
    backgroundColor: '#fff5f5',
  },
  entryRepaid: {
    borderLeftWidth: 6,
    borderLeftColor: '#10b981',
    backgroundColor: '#f6fdf9',
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  entryLeft: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  entryDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  entryNotes: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  badgeOverdue: {
    backgroundColor: '#fee2e2',
  },
  badgeRepaid: {
    backgroundColor: '#dcfce7',
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextOverdue: {
    color: '#dc2626',
  },
  badgeTextRepaid: {
    color: '#16a34a',
  },
  badgeTextPending: {
    color: '#d97706',
  },
  repayBtn: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#ecfdf5',
    borderRadius: 6,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  repayBtnText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
});

