import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import client from '../api/client';
import * as ImagePicker from 'expo-image-picker';

export default function AddLoanScreen({ navigation }) {
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUri, setReceiptUri] = useState(null);
  const [loading, setLoading] = useState(false);

  // Set quick due date helper (+15 days or +30 days)
  const setQuickDueDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera roll permission is required to attach receipts');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Image picker error', e);
      Alert.alert('Notice', 'Photo attachment is available on physical devices with camera permissions');
    }
  };

  const handleSubmit = async () => {
    // Validations
    if (!friendName.trim() || friendName.trim().length < 2) {
      Alert.alert('Validation Error', "Please enter a valid friend's name (min 2 chars)");
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid loan amount greater than ₹0');
      return;
    }

    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert('Validation Error', 'Please enter a valid due date in YYYY-MM-DD format');
      return;
    }

    setLoading(true);
    try {
      // 1. Create loan
      const res = await client.post('/loans', {
        friendName: friendName.trim(),
        amount: numAmount,
        dueDate,
        notes: notes.trim(),
      });

      const created = res.data?.data || res.data;

      // 2. Upload receipt if selected
      if (receiptUri && created?._id) {
        try {
          const formData = new FormData();
          formData.append('receipt', {
            uri: receiptUri,
            name: 'receipt.jpg',
            type: 'image/jpeg',
          });

          await client.post(`/loans/${created._id}/receipt`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (uploadErr) {
          console.warn('Receipt upload notice', uploadErr);
        }
      }

      Alert.alert('Success', 'Loan entry recorded successfully!');
      // Reset form
      setFriendName('');
      setAmount('');
      setDueDate('');
      setNotes('');
      setReceiptUri(null);

      navigation?.navigate?.('Dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Failed to save loan';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>New Loan Entry</Text>
      <Text style={styles.subtitle}>Record money lent to friends with repayment tracking</Text>

      <View style={styles.card}>
        {/* Friend Name */}
        <Text style={styles.label}>Friend Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Rahul Sharma"
          value={friendName}
          onChangeText={setFriendName}
        />

        {/* Amount */}
        <Text style={styles.label}>Amount (₹) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 5000"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        {/* Due Date */}
        <Text style={styles.label}>Due Date (YYYY-MM-DD) *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD (e.g. 2026-11-30)"
          value={dueDate}
          onChangeText={setDueDate}
        />

        {/* Quick Date helper */}
        <View style={styles.quickDateRow}>
          <Text style={styles.quickDateLabel}>Quick Due:</Text>
          <TouchableOpacity style={styles.quickDateBtn} onPress={() => setQuickDueDate(7)}>
            <Text style={styles.quickDateText}>+7 Days</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickDateBtn} onPress={() => setQuickDueDate(15)}>
            <Text style={styles.quickDateText}>+15 Days</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickDateBtn} onPress={() => setQuickDueDate(30)}>
            <Text style={styles.quickDateText}>+30 Days</Text>
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Reason for loan, split details, etc."
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />

        {/* Bonus: Receipt Photo Upload */}
        <Text style={styles.label}>Receipt Photo (Bonus Feature)</Text>
        {receiptUri ? (
          <View style={styles.receiptPreviewBox}>
            <Image source={{ uri: receiptUri }} style={styles.receiptThumb} />
            <TouchableOpacity onPress={() => setReceiptUri(null)} style={styles.removePhotoBtn}>
              <Text style={styles.removePhotoText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
            <Text style={styles.uploadBtnText}>📷 Select Receipt Photo</Text>
          </TouchableOpacity>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>✓ Save Loan Record</Text>
          )}
        </TouchableOpacity>
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
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 30,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 46,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    fontSize: 15,
    color: '#1e293b',
  },
  textArea: {
    height: 70,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  quickDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  quickDateLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  quickDateBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#e0e7ff',
    borderRadius: 6,
  },
  quickDateText: {
    color: '#4338ca',
    fontSize: 11,
    fontWeight: '600',
  },
  uploadBtn: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  uploadBtnText: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '600',
  },
  receiptPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  receiptThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removePhotoBtn: {
    padding: 6,
  },
  removePhotoText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

