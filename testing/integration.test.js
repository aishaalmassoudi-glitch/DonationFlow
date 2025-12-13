const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { app, connectDB } = require('../server');
const User = require('../models/User');

describe('Integration Tests', () => {
  let token;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'testsecret';

    await connectDB();
    await mongoose.connection.db.dropDatabase();

    const hash = await bcrypt.hash('password', 10);
    await User.create({
      username: 'admin',
      passwordHash: hash,
      role: 'admin'
    });

    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'password' });

    token = res.body.token;
  }, 15000);

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test(
    'Create donor',
    async () => {
      const res = await request(app)
        .post('/api/donors')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Ahmed Ali',
          phone: '0501234567',   // ✅ REQUIRED
          email: 'ahmed@test.com'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('Ahmed Ali');
    },
    10000
  );
});
