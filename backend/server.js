const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const { createClient } = require('redis');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Security & Middlewares
app.use(helmet()); // Adds extra headers for security (Security Groups equivalent in app level)
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// Rate Limiting to prevent DDoS (DDoS Protection like AWS WAF)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// PostgreSQL Connection (Simulating RDS)
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sudoku_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Redis Connection (Simulating ElastiCache for caching rankings)
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Initial connection
(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (e) {
    console.error('Failed to connect to Redis', e);
  }
})();


// Endpoints

// 1. Health Check (Required for ALB & ECS Auto Scaling)
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await pool.query('SELECT 1');
    const redisStatus = redisClient.isReady;
    res.status(200).json({ 
      status: 'UP', 
      db: dbStatus ? 'UP' : 'DOWN',
      redis: redisStatus ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      container_id: process.env.HOSTNAME || 'unknown' // To demonstrate Round Robin
    });
  } catch (error) {
    res.status(503).json({ status: 'DOWN', error: error.message });
  }
});

// 2. Start Game
app.post('/api/start-game', async (req, res) => {
  const { username, difficulty } = req.body;
  
  if (!username || !difficulty) {
    return res.status(400).json({ error: 'Username and difficulty are required' });
  }

  try {
    // Basic user creation or fetch
    let userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
      userResult = await pool.query('INSERT INTO users (username) VALUES ($1) RETURNING id', [username]);
    }
    const userId = userResult.rows[0].id;

    // Generate a basic board (simplified logic for the sake of architecture demonstration)
    const boardState = '000000000...'; // Imagine full 81 chars logic here
    
    const gameResult = await pool.query(
      'INSERT INTO games (user_id, difficulty, board_state) VALUES ($1, $2, $3) RETURNING id',
      [userId, difficulty, boardState]
    );

    res.status(201).json({
      message: 'Game started successfully',
      gameId: gameResult.rows[0].id,
      board: boardState
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Validate Move (Simulating intensive backend calculation)
app.post('/api/validate-move', (req, res) => {
  const { gameId, row, col, value } = req.body;
  // This is where ECS processing power would be used
  // Returning a dummy validation to focus on architecture
  const isValid = true; 
  res.status(200).json({ isValid, message: isValid ? 'Valid move' : 'Invalid move' });
});

// 4. Save Score
app.post('/api/save-score', async (req, res) => {
  const { gameId, userId, timeSeconds, score } = req.body;
  try {
    await pool.query(
      'INSERT INTO scores (user_id, game_id, time_seconds, score) VALUES ($1, $2, $3, $4)',
      [userId, gameId, timeSeconds, score]
    );
    // Invalidate Cache for rankings to force refresh on next read
    await redisClient.del('leaderboard_cache');
    
    res.status(201).json({ message: 'Score saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. Leaderboard (Using Redis ElastiCache for high performance reads)
app.get('/api/leaderboard', async (req, res) => {
  try {
    // Try cache first (ElastiCache strategy)
    const cachedData = await redisClient.get('leaderboard_cache');
    if (cachedData) {
      console.log('Serving leaderboard from Redis Cache');
      return res.status(200).json(JSON.parse(cachedData));
    }

    // If not in cache, query PostgreSQL (RDS)
    console.log('Serving leaderboard from PostgreSQL');
    const result = await pool.query(`
      SELECT u.username, s.score, s.time_seconds 
      FROM scores s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.score DESC, s.time_seconds ASC
      LIMIT 10
    `);

    const leaderboardData = result.rows;

    // Save to Cache for 5 minutes
    await redisClient.setEx('leaderboard_cache', 300, JSON.stringify(leaderboardData));

    res.status(200).json(leaderboardData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}. Simulated ECS Container ID: ${process.env.HOSTNAME}`);
});
