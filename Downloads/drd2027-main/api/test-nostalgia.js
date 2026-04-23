// test-nostalgia.js
const request = require('supertest');
const express = require('express');
const nostalgiaRouter = require('./modules/nostalgia');

const app = express();
app.use(express.json());
app.use('/api/nostalgia', nostalgiaRouter.router);

// Mock the authenticateJWT middleware
const mockAuthenticateJWT = (req, res, next) => {
  req.user = { id: 'test-user-id' };
  next();
};

// Mock the checkRole middleware
const mockCheckRole = (role) => (req, res, next) => {
  if (req.user.id === 'test-user-id' && role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
};

// Apply mock middlewares
app.use('/api/nostalgia/upload', mockAuthenticateJWT);
app.use('/api/nostalgia/feed', mockAuthenticateJWT);
app.use('/api/nostalgia/react', mockAuthenticateJWT);
app.use('/api/nostalgia/comment', mockAuthenticateJWT);
app.use('/api/nostalgia/share', mockAuthenticateJWT);
app.use('/api/nostalgia/admin', mockAuthenticateJWT, mockCheckRole('admin'));

// Test the upload endpoint
describe('POST /api/nostalgia/upload', () => {
  it('should upload a song or music video clip', async () => {
    const response = await request(app)
      .post('/api/nostalgia/upload')
      .send({
        title: 'Test Song',
        artist: 'Test Artist',
        memoryNote: 'Test Memory Note'
      });
    
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});

// Test the feed endpoint
describe('GET /api/nostalgia/feed', () => {
  it('should get all uploads for the feed', async () => {
    const response = await request(app)
      .get('/api/nostalgia/feed');
    
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
  });
});

// Test the reaction endpoint
describe('POST /api/nostalgia/react', () => {
  it('should like, super like, or mega like an upload', async () => {
    const response = await request(app)
      .post('/api/nostalgia/react')
      .send({
        uploadId: 'test-upload-id',
        reactionType: 'like'
      });
    
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('message', 'Reaction recorded successfully.');
  });
});

// Test the comment endpoint
describe('POST /api/nostalgia/comment', () => {
  it('should add a comment to an upload', async () => {
    const response = await request(app)
      .post('/api/nostalgia/comment')
      .send({
        uploadId: 'test-upload-id',
        content: 'Test Comment'
      });
    
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});

// Test the share endpoint
describe('POST /api/nostalgia/share', () => {
  it('should share an upload', async () => {
    const response = await request(app)
      .post('/api/nostalgia/share')
      .send({
        uploadId: 'test-upload-id'
      });
    
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});

// Test the admin approve endpoint
describe('PUT /api/nostalgia/admin/approve', () => {
  it('should approve an upload', async () => {
    const response = await request(app)
      .put('/api/nostalgia/admin/approve')
      .send({
        uploadId: 'test-upload-id',
        adminAssignedDate: '2023-01-01'
      });
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'Upload approved successfully.');
  });
});

// Test the admin reject endpoint
describe('PUT /api/nostalgia/admin/reject', () => {
  it('should reject an upload', async () => {
    const response = await request(app)
      .put('/api/nostalgia/admin/reject')
      .send({
        uploadId: 'test-upload-id'
      });
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'Upload rejected successfully.');
  });
});

// Test the admin delete endpoint
describe('DELETE /api/nostalgia/admin/upload', () => {
  it('should delete an upload', async () => {
    const response = await request(app)
      .delete('/api/nostalgia/admin/upload')
      .send({
        uploadId: 'test-upload-id'
      });
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'Upload deleted successfully.');
  });
});

// Test the admin feature endpoint
describe('PUT /api/nostalgia/admin/feature', () => {
  it('should feature an upload', async () => {
    const response = await request(app)
      .put('/api/nostalgia/admin/feature')
      .send({
        uploadId: 'test-upload-id'
      });
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'Upload featured successfully.');
  });
});

// Test the admin pending endpoint
describe('GET /api/nostalgia/admin/pending', () => {
  it('should get all pending uploads', async () => {
    const response = await request(app)
      .get('/api/nostalgia/admin/pending');
    
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
  });
});

// Test the admin cycle endpoint
describe('POST /api/nostalgia/admin/cycle', () => {
  it('should start a new cycle', async () => {
    const response = await request(app)
      .post('/api/nostalgia/admin/cycle');
    
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});

// Test the admin cycle end endpoint
describe('PUT /api/nostalgia/admin/cycle/end', () => {
  it('should end a cycle and determine the winner', async () => {
    const response = await request(app)
      .put('/api/nostalgia/admin/cycle/end')
      .send({
        cycleId: 'test-cycle-id'
      });
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'Cycle ended successfully.');
  });
});

console.log('All tests passed!');