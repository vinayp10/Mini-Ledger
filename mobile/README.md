# 📱 MiniLedger - React Native Mobile App

This is the mobile client for the **MiniLedger** loan & lending tracker, designed specifically for the **Credsetu Technologies Full Stack Development Internship Assignment**.

---

## 🌟 Key Features

1. **Phone + OTP Authentication Screen**:
   - 10-digit Indian mobile number validation (`/^[6-9]\d{9}$/`).
   - One-Time Password verification with JWT token storage in `AsyncStorage`.
2. **Dashboard with Summary Card at the Top**:
   - Total Lent, Total Repaid, and Overdue Amount cards.
   - Quick navigation to add a loan or inspect records.
3. **Loan Entries List (Overdue Highlighted)**:
   - Overdue entries visually highlighted with prominent red borders and tags.
   - Filter by All, Pending, Overdue, Repaid.
   - Real-time search by friend name.
   - One-tap "Mark as Repaid" and "Delete" actions.
4. **Form to Add an Entry**:
   - Friend name, positive amount in ₹, future due date with quick helper buttons (+7, +15, +30 days), and notes.
   - **Bonus**: Receipt photo upload via device image picker!

---

## 🚀 How to Run the Mobile App

### 1. Ensure Backend is Running
Start the backend first:
```bash
cd ../server
npm start
```

### 2. Run the App using Expo
```bash
cd mobile
npm install
npx expo start
```

### 3. Open on Device or Emulator
- **Physical Phone**: Scan the QR code using the **Expo Go** app on Android or iOS camera.
- **Android Emulator**: Press `a` in the terminal.
- **iOS Simulator**: Press `i` in the terminal.
- **Web Browser**: Press `w` in the terminal.

> **Note for Local IP**: If testing on a physical phone via Wi-Fi, update `baseURL` in `src/api/client.js` to your computer's local Wi-Fi IP (e.g. `http://192.168.1.X:5000/api`).

