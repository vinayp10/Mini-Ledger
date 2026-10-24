import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import client from '../api/client';

export default function LoanListScreen({ navigation }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchLoans = async () => {
    try {
      const res = await client.get('/loans');
      const data = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      setLoans(data);
    } catch (err) {
      console.warn('Error loading loans', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoans();
    const unsubscribe = navigation?.addListener?.('focus', () => {
      fetchLoans();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLoans();
  };

  const handleMarkRepaid = async (id) => {
    try {
      await client.patch(`/loans/${id}/repay`);
      Alert.alert('Success', 'Loan marked as repaid!');
      fetchLoans();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update loan');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this loan record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.delete(`/loans/${id}`);
            fetchLoans();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete loan');
          }
        },
      },
    ]);
  };

  const getStatus = (item) => {
    if (item.status === 'repaid') return 'repaid';
    if (item.status === 'overdue') return 'overdue';
    if (item.dueDate && new Date(item.dueDate) < new Date()) return 'overdue';
    return 'pending';
  };

  const filteredLoans = loans
    .filter((l) => {
      const status = getStatus(l);
      if (filter === 'all') return true;
      return status === filter;
    })
    .filter((l) =>
      l.friendName?.toLowerCase().includes(search.toLowerCase())
    );

  const renderLoanItem = ({ item }) => {
    const status = getStatus(item);
    const isOverdue = status === 'overdue';
    const isRepaid = status === 'repaid';

    return (
      <View
        style={[
          styles.card,
          isOverdue && styles.cardOverdue, // OVERDUE HIGHLIGHTED IN RED
          isRepaid && styles.cardRepaid,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.friendName}>{item.friendName}</Text>
            <Text style={styles.dueDate}>
              Due: {new Date(item.dueDate).toLocaleDateString('en-GB')}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.amount}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
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

        {item.notes ? (
          <Text style={styles.notesText}>{item.notes}</Text>
        ) : null}

        <View style={styles.cardActions}>
          {status !== 'repaid' && (
            <TouchableOpacity
              style={styles.repayBtn}
              onPress={() => handleMarkRepaid(item._id)}
            >
              <Text style={styles.repayBtnText}>Mark Repaid</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item._id)}
          >
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search friend name..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['all', 'pending', 'overdue', 'repaid'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === f && styles.filterChipTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <FlatList
          data={filteredLoans}
          keyExtractor={(item) => item._id}
          renderItem={renderLoanItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No loans found</Text>
              <Text style={styles.emptySub}>
                {search ? 'Try a different search keyword' : 'No records under this filter'}
              </Text>
            </View>
          }
        />
      )}
    </View>
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
  },
  searchBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    height: 42,
    fontSize: 14,
    color: '#1e293b',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#4f46e5',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardOverdue: {
    borderLeftWidth: 6,
    borderLeftColor: '#ef4444',
    backgroundColor: '#fff5f5',
  },
  cardRepaid: {
    borderLeftWidth: 6,
    borderLeftColor: '#10b981',
    backgroundColor: '#f6fdf9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  dueDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerRight: {
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
    borderRadius: 6,
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
  notesText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderRadius: 6,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  repayBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  repayBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  deleteBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  emptySub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
});

