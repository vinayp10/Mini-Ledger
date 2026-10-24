import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../server.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Auth API', () => {
  const testPhone = '9876543210';

  describe('POST /api/auth/send-otp', () => {
    it('should send OTP successfully for a valid phone number', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: testPhone });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('OTP sent successfully');
    });

    it('should return 400 if phone is missing', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should return 400 if phone is not 10 digits', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if phone contains non-digit characters', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: 'abcdefghij' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should verify OTP and return a JWT token', async () => {
      // First send OTP
      const sendRes = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: testPhone });

      const otp = sendRes.body.otp; // Available in dev mode

      // Verify OTP
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: testPhone, otp });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.phone).toBe(testPhone);
    });

    it('should return 400 for incorrect OTP', async () => {
      // Send OTP
      await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: testPhone });

      // Try wrong OTP
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: testPhone, otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid OTP. Please try again.');
    });

    it('should return 404 if user has not requested OTP', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '1111111111', otp: '123456' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if phone or otp is missing', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: testPhone });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should not allow reuse of OTP after successful verification', async () => {
      // Send OTP
      const sendRes = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: testPhone });
      const otp = sendRes.body.otp;

      // Verify once
      await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: testPhone, otp });

      // Try to reuse
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: testPhone, otp });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Protected Route Access', () => {
    it('should deny access to protected routes without token', async () => {
      const res = await request(app).get('/api/loans');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should deny access with invalid token', async () => {
      const res = await request(app)
        .get('/api/loans')
        .set('Authorization', 'Bearer invalid_token_here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
