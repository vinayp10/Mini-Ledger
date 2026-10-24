import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../server.js';

let mongoServer;
let authToken;
const testPhone = '9876543210';

/**
 * Helper: Get a valid JWT token for testing
 */
const getAuthToken = async () => {
  const sendRes = await request(app)
    .post('/api/auth/send-otp')
    .send({ phone: testPhone });

  const otp = sendRes.body.otp;

  const verifyRes = await request(app)
    .post('/api/auth/verify-otp')
    .send({ phone: testPhone, otp });

  return verifyRes.body.token;
};

/**
 * Helper: Create a loan entry for testing
 */
const createTestLoan = async (token, overrides = {}) => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  const loanData = {
    friendName: 'John Doe',
    amount: 5000,
    dueDate: futureDate.toISOString(),
    notes: 'Test loan',
    ...overrides,
  };

  const res = await request(app)
    .post('/api/loans')
    .set('Authorization', `Bearer ${token}`)
    .send(loanData);

  return res;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  authToken = await getAuthToken();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear loans but keep user for auth token
  const Loan = mongoose.connection.collection('loans');
  if (Loan) await Loan.deleteMany({});
});

describe('Loans API', () => {
  // ─── CREATE LOAN ─────────────────────────────────────────────────────
  describe('POST /api/loans', () => {
    it('should create a loan entry successfully', async () => {
      const res = await createTestLoan(authToken);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.friendName).toBe('John Doe');
      expect(res.body.data.amount).toBe(5000);
      expect(res.body.data.status).toBe('pending');
    });

    it('should return 400 if friendName is missing', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 5000, dueDate: futureDate.toISOString() });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if amount is negative', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          friendName: 'Jane',
          amount: -100,
          dueDate: futureDate.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if friendName is too short', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          friendName: 'A',
          amount: 1000,
          dueDate: futureDate.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if dueDate is in the past', async () => {
      const pastDate = new Date('2020-01-01');

      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          friendName: 'Jane Doe',
          amount: 1000,
          dueDate: pastDate.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/loans')
        .send({ friendName: 'Test', amount: 100, dueDate: new Date().toISOString() });

      expect(res.status).toBe(401);
    });
  });

  // ─── GET LOANS ───────────────────────────────────────────────────────
  describe('GET /api/loans', () => {
    it('should return all loans for the logged-in user', async () => {
      await createTestLoan(authToken);
      await createTestLoan(authToken, { friendName: 'Jane Smith', amount: 3000 });

      const res = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.data).toHaveLength(2);
    });

    it('should return empty array when no loans exist', async () => {
      const res = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should filter loans by status', async () => {
      await createTestLoan(authToken);

      const res = await request(app)
        .get('/api/loans?status=pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((l) => l.status === 'pending')).toBe(true);
    });

    it('should return 400 for invalid status query', async () => {
      const res = await request(app)
        .get('/api/loans?status=invalid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── REPAY LOAN ──────────────────────────────────────────────────────
  describe('PATCH /api/loans/:id/repay', () => {
    it('should mark a loan as repaid', async () => {
      const createRes = await createTestLoan(authToken);
      const loanId = createRes.body.data._id;

      const res = await request(app)
        .patch(`/api/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('repaid');
      expect(res.body.data.repaidDate).toBeDefined();
    });

    it('should return 400 if loan is already repaid', async () => {
      const createRes = await createTestLoan(authToken);
      const loanId = createRes.body.data._id;

      // Repay first time
      await request(app)
        .patch(`/api/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to repay again
      const res = await request(app)
        .patch(`/api/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('This loan has already been marked as repaid.');
    });

    it('should return 404 for non-existent loan', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/loans/${fakeId}/repay`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid loan ID format', async () => {
      const res = await request(app)
        .patch('/api/loans/invalid-id/repay')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ─── DELETE LOAN ─────────────────────────────────────────────────────
  describe('DELETE /api/loans/:id', () => {
    it('should delete a loan entry', async () => {
      const createRes = await createTestLoan(authToken);
      const loanId = createRes.body.data._id;

      const res = await request(app)
        .delete(`/api/loans/${loanId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Loan entry deleted successfully');

      // Verify it's gone
      const getRes = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.body.data).toHaveLength(0);
    });

    it('should return 404 for non-existent loan', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/loans/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── SUMMARY ─────────────────────────────────────────────────────────
  describe('GET /api/loans/summary', () => {
    it('should return correct summary with no loans', async () => {
      const res = await request(app)
        .get('/api/loans/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        totalLent: 0,
        totalRepaid: 0,
        overdueAmount: 0,
        totalEntries: 0,
        overdueEntries: 0,
      });
    });

    it('should return correct summary with mixed loans', async () => {
      // Create a pending loan
      await createTestLoan(authToken, { amount: 1000 });

      // Create and repay a loan
      const repayRes = await createTestLoan(authToken, { amount: 2000 });
      await request(app)
        .patch(`/api/loans/${repayRes.body.data._id}/repay`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .get('/api/loans/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalLent).toBe(3000);
      expect(res.body.data.totalRepaid).toBe(2000);
      expect(res.body.data.totalEntries).toBe(2);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/loans/summary');

      expect(res.status).toBe(401);
    });
  });
});

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('MiniLedger API is running');
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Route not found');
  });
});
