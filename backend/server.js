const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDatabase } = require('./database');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());

let db = null;

// Initialize database
initDatabase().then(database => {
  db = database;
  console.log('Database ready!');
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Wait for database middleware
app.use((req, res, next) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  next();
});

// Save database after write operations
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    if (req.method !== 'GET' && db) {
      db.saveToFile();
    }
    originalJson.call(this, data);
  };
  next();
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// ===== AUTH ROUTES =====
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, isPorter, bio, contactInfo, serviceAreas } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = isPorter ? 'Porter' : (role || 'User');
    
    const insertUser = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    const result = insertUser.run(name, email, hashedPassword, userRole);
    const userId = result.lastInsertRowid;
    
    // If porter, create porter profile
    if (isPorter) {
      const insertPorterProfile = db.prepare('INSERT INTO porter_profiles (porter_id, bio, contact_info) VALUES (?, ?, ?)');
      insertPorterProfile.run(userId, bio || '', contactInfo || '');
      
      // Add service areas
      if (serviceAreas && serviceAreas.length > 0) {
        const insertServiceArea = db.prepare('INSERT INTO porter_service_areas (porter_id, location_id) VALUES (?, ?)');
        serviceAreas.forEach(locationId => {
          insertServiceArea.run(userId, locationId);
        });
      }
    }
    
    res.status(201).json({ 
      message: 'User registered successfully',
      userId 
    });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const getUser = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = getUser.get(email);
    
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        isLeader: user.is_leader
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const getUser = db.prepare('SELECT user_id, name, email, role, is_leader FROM users WHERE user_id = ?');
    const user = getUser.get(req.user.userId);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== LOCATION ROUTES =====
app.get('/api/locations', (req, res) => {
  try {
    const getLocations = db.prepare('SELECT * FROM locations ORDER BY name');
    const locations = getLocations.all();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/locations', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { name, description } = req.body;
    const insertLocation = db.prepare('INSERT INTO locations (name, description) VALUES (?, ?)');
    const result = insertLocation.run(name, description);
    res.status(201).json({ locationId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/locations/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { name, description } = req.body;
    const updateLocation = db.prepare('UPDATE locations SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE location_id = ?');
    updateLocation.run(name, description, req.params.id);
    res.json({ message: 'Location updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== TRAIL ROUTES =====
app.get('/api/trails', (req, res) => {
  const { locationId } = req.query;
  
  try {
    let query = `
      SELECT t.*, l.name as location_name 
      FROM trails t 
      JOIN locations l ON t.location_id = l.location_id
    `;
    
    if (locationId) {
      query += ' WHERE t.location_id = ?';
      const getTrails = db.prepare(query + ' ORDER BY t.name');
      const trails = getTrails.all(locationId);
      return res.json(trails);
    } else {
      const getTrails = db.prepare(query + ' ORDER BY t.name');
      const trails = getTrails.all();
      return res.json(trails);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trails', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { locationId, name, difficulty, description, averageDist, averageTime, altitude } = req.body;
    const insertTrail = db.prepare('INSERT INTO trails (location_id, name, difficulty, description, average_dist, average_time, altitude) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const result = insertTrail.run(locationId, name, difficulty, description, averageDist, averageTime, altitude);
    res.status(201).json({ trailId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== TRIP ROUTES =====
app.get('/api/trips', (req, res) => {
  const { locationId, difficulty, minCost, maxCost, startDate, status, search } = req.query;
  
  try {
    let query = `
      SELECT 
        t.*,
        tr.name as trail_name,
        tr.difficulty,
        l.name as location_name,
        u.name as leader_name,
        (SELECT COUNT(*) FROM participations p WHERE p.trip_id = t.trip_id AND p.status = 'Confirmed') as confirmed_participants
      FROM trips t
      JOIN trails tr ON t.trail_id = tr.trail_id
      JOIN locations l ON tr.location_id = l.location_id
      JOIN users u ON t.leader_id = u.user_id
      WHERE 1=1
    `;
    const params = [];
    
    if (locationId) {
      query += ' AND l.location_id = ?';
      params.push(locationId);
    }
    
    if (difficulty) {
      query += ' AND tr.difficulty = ?';
      params.push(difficulty);
    }
    
    if (minCost) {
      query += ' AND t.estimated_cost >= ?';
      params.push(minCost);
    }
    
    if (maxCost) {
      query += ' AND t.estimated_cost <= ?';
      params.push(maxCost);
    }
    
    if (startDate) {
      query += ' AND t.start_date >= ?';
      params.push(startDate);
    }
    
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    } else {
      query += " AND t.status != 'Canceled'";
    }
    
    if (search) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY t.start_date';
    
    const getTrips = db.prepare(query);
    const trips = getTrips.all(...params);
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/trips/:id', (req, res) => {
  try {
    const query = `
      SELECT 
        t.*,
        tr.name as trail_name,
        tr.difficulty,
        tr.description as trail_description,
        l.name as location_name,
        u.name as leader_name,
        u.email as leader_email,
        (SELECT COUNT(*) FROM participations p WHERE p.trip_id = t.trip_id AND p.status = 'Confirmed') as confirmed_participants
      FROM trips t
      JOIN trails tr ON t.trail_id = tr.trail_id
      JOIN locations l ON tr.location_id = l.location_id
      JOIN users u ON t.leader_id = u.user_id
      WHERE t.trip_id = ?
    `;
    
    const getTrip = db.prepare(query);
    const trip = getTrip.get(req.params.id);
    
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trips', authenticateToken, (req, res) => {
  try {
    const { trailId, title, description, startDate, endDate, maxParticipants, needPorter, registrationDeadline, estimatedCost } = req.body;
    
    // Update user to be a leader
    const updateUser = db.prepare('UPDATE users SET is_leader = 1 WHERE user_id = ?');
    updateUser.run(req.user.userId);
    
    const insertTrip = db.prepare(`INSERT INTO trips (leader_id, trail_id, title, description, start_date, end_date, max_participants, need_porter, registration_deadline, estimated_cost, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft')`);
    const result = insertTrip.run(req.user.userId, trailId, title, description, startDate, endDate, maxParticipants, needPorter ? 1 : 0, registrationDeadline, estimatedCost);
    
    res.status(201).json({ tripId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/trips/:id', authenticateToken, (req, res) => {
  try {
    const { trailId, title, description, startDate, endDate, maxParticipants, needPorter, registrationDeadline, estimatedCost, status } = req.body;
    
    // Check if user is the leader or admin
    const getTrip = db.prepare('SELECT leader_id FROM trips WHERE trip_id = ?');
    const trip = getTrip.get(req.params.id);
    
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    
    if (trip.leader_id !== req.user.userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updateTrip = db.prepare(`UPDATE trips SET trail_id = ?, title = ?, description = ?, start_date = ?, end_date = ?, 
       max_participants = ?, need_porter = ?, registration_deadline = ?, estimated_cost = ?, status = ?, 
       updated_at = CURRENT_TIMESTAMP WHERE trip_id = ?`);
    updateTrip.run(trailId, title, description, startDate, endDate, maxParticipants, needPorter ? 1 : 0, registrationDeadline, estimatedCost, status, req.params.id);
    
    res.json({ message: 'Trip updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/trips/:id', authenticateToken, (req, res) => {
  try {
    const getTrip = db.prepare('SELECT leader_id FROM trips WHERE trip_id = ?');
    const trip = getTrip.get(req.params.id);
    
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    
    if (trip.leader_id !== req.user.userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const cancelTrip = db.prepare('UPDATE trips SET status = ? WHERE trip_id = ?');
    cancelTrip.run('Canceled', req.params.id);
    
    res.json({ message: 'Trip canceled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== PARTICIPATION ROUTES =====
app.get('/api/trips/:id/participants', (req, res) => {
  try {
    const query = `
      SELECT p.*, u.name, u.email, u.phone
      FROM participations p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.trip_id = ?
      ORDER BY p.joined_at
    `;
    
    const getParticipants = db.prepare(query);
    const participants = getParticipants.all(req.params.id);
    res.json(participants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trips/:id/join', authenticateToken, (req, res) => {
  try {
    const { role } = req.body;
    
    // Check for schedule conflicts
    const conflictQuery = `SELECT t.trip_id FROM trips t
     JOIN participations p ON t.trip_id = p.trip_id
     WHERE p.user_id = ? AND p.status = 'Confirmed'
     AND ((t.start_date BETWEEN (SELECT start_date FROM trips WHERE trip_id = ?) AND (SELECT end_date FROM trips WHERE trip_id = ?))
     OR (t.end_date BETWEEN (SELECT start_date FROM trips WHERE trip_id = ?) AND (SELECT end_date FROM trips WHERE trip_id = ?)))`;
    
    const checkConflict = db.prepare(conflictQuery);
    const conflict = checkConflict.get(req.user.userId, req.params.id, req.params.id, req.params.id, req.params.id);
    
    if (conflict) return res.status(400).json({ error: 'Schedule conflict with another trip' });
    
    // Check if already registered
    const checkExisting = db.prepare('SELECT * FROM participations WHERE trip_id = ? AND user_id = ?');
    const existing = checkExisting.get(req.params.id, req.user.userId);
    
    if (existing) return res.status(400).json({ error: 'Already registered for this trip' });
    
    // Check if trip is full
    const getTripInfo = db.prepare(`SELECT t.max_participants, COUNT(p.participation_id) as current_count
             FROM trips t
             LEFT JOIN participations p ON t.trip_id = p.trip_id AND p.status = 'Confirmed'
             WHERE t.trip_id = ?
             GROUP BY t.trip_id`);
    const tripInfo = getTripInfo.get(req.params.id);
    
    if (tripInfo && tripInfo.current_count >= tripInfo.max_participants) {
      return res.status(400).json({ error: 'Trip is full' });
    }
    
    const insertParticipation = db.prepare('INSERT INTO participations (trip_id, user_id, role, status) VALUES (?, ?, ?, ?)');
    const result = insertParticipation.run(req.params.id, req.user.userId, role || 'User', 'Pending');
    
    res.status(201).json({ participationId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/participations/:id', authenticateToken, (req, res) => {
  try {
    const { status } = req.body;
    
    const getParticipation = db.prepare('SELECT p.*, t.leader_id FROM participations p JOIN trips t ON p.trip_id = t.trip_id WHERE p.participation_id = ?');
    const participation = getParticipation.get(req.params.id);
    
    if (!participation) return res.status(404).json({ error: 'Participation not found' });
    
    // Only leader or admin can approve/decline
    if (participation.leader_id !== req.user.userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updateParticipation = db.prepare('UPDATE participations SET status = ? WHERE participation_id = ?');
    updateParticipation.run(status, req.params.id);
    
    res.json({ message: 'Participation updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/participations/:id', authenticateToken, (req, res) => {
  try {
    const getParticipation = db.prepare('SELECT user_id FROM participations WHERE participation_id = ?');
    const participation = getParticipation.get(req.params.id);
    
    if (!participation) return res.status(404).json({ error: 'Participation not found' });
    
    if (participation.user_id !== req.user.userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const cancelParticipation = db.prepare('UPDATE participations SET status = ? WHERE participation_id = ?');
    cancelParticipation.run('Canceled', req.params.id);
    
    res.json({ message: 'Participation canceled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== PORTER ROUTES =====
app.get('/api/porters', (req, res) => {
  const { locationId } = req.query;
  
  try {
    let query = `
      SELECT u.user_id, u.name, u.email, u.phone, pp.bio, pp.average_rating, pp.contact_info
      FROM users u
      JOIN porter_profiles pp ON u.user_id = pp.porter_id
    `;
    
    if (locationId) {
      query += `
        WHERE EXISTS (
          SELECT 1 FROM porter_service_areas psa 
          WHERE psa.porter_id = u.user_id AND psa.location_id = ?
        )
      `;
      query += ' ORDER BY pp.average_rating DESC';
      const getPorters = db.prepare(query);
      const porters = getPorters.all(locationId);
      return res.json(porters);
    } else {
      query += ' ORDER BY pp.average_rating DESC';
      const getPorters = db.prepare(query);
      const porters = getPorters.all();
      return res.json(porters);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/porters/:id', (req, res) => {
  try {
    const query = `
      SELECT u.*, pp.bio, pp.average_rating, pp.contact_info,
             GROUP_CONCAT(l.name) as service_areas
      FROM users u
      JOIN porter_profiles pp ON u.user_id = pp.porter_id
      LEFT JOIN porter_service_areas psa ON u.user_id = psa.porter_id
      LEFT JOIN locations l ON psa.location_id = l.location_id
      WHERE u.user_id = ?
      GROUP BY u.user_id
    `;
    
    const getPorter = db.prepare(query);
    const porter = getPorter.get(req.params.id);
    
    if (!porter) return res.status(404).json({ error: 'Porter not found' });
    res.json(porter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== RATING ROUTES =====
app.get('/api/ratings', (req, res) => {
  const { tripId, userId, ratingType } = req.query;
  
  try {
    let query = `
      SELECT r.*, 
             rater.name as rater_name,
             rated.name as rated_name,
             t.title as trip_title
      FROM ratings r
      JOIN users rater ON r.rater_id = rater.user_id
      JOIN users rated ON r.rated_user_id = rated.user_id
      JOIN trips t ON r.trip_id = t.trip_id
      WHERE 1=1
    `;
    const params = [];
    
    if (tripId) {
      query += ' AND r.trip_id = ?';
      params.push(tripId);
    }
    
    if (userId) {
      query += ' AND r.rated_user_id = ?';
      params.push(userId);
    }
    
    if (ratingType) {
      query += ' AND r.rating_type = ?';
      params.push(ratingType);
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const getRatings = db.prepare(query);
    const ratings = getRatings.all(...params);
    res.json(ratings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ratings', authenticateToken, (req, res) => {
  try {
    const { ratedUserId, tripId, ratingType, score, comment } = req.body;
    
    // Check if user participated in trip
    const checkParticipation = db.prepare('SELECT * FROM participations WHERE trip_id = ? AND user_id = ? AND status = ?');
    const participation = checkParticipation.get(tripId, req.user.userId, 'Confirmed');
    
    if (!participation) return res.status(400).json({ error: 'You must participate in the trip to rate' });
    
    // Check if already rated
    const checkExisting = db.prepare('SELECT * FROM ratings WHERE rater_id = ? AND rated_user_id = ? AND trip_id = ?');
    const existing = checkExisting.get(req.user.userId, ratedUserId, tripId);
    
    if (existing) return res.status(400).json({ error: 'Already rated this user for this trip' });
    
    const insertRating = db.prepare('INSERT INTO ratings (rater_id, rated_user_id, trip_id, rating_type, score, comment) VALUES (?, ?, ?, ?, ?, ?)');
    const result = insertRating.run(req.user.userId, ratedUserId, tripId, ratingType, score, comment);
    
    // Update average rating for porter
    if (ratingType === 'Porter') {
      const updateRating = db.prepare(`UPDATE porter_profiles SET average_rating = (
                SELECT AVG(score) FROM ratings WHERE rated_user_id = ? AND rating_type = 'Porter'
              ) WHERE porter_id = ?`);
      updateRating.run(ratedUserId, ratedUserId);
    }
    
    res.status(201).json({ ratingId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== REPORT ROUTES =====
app.get('/api/reports', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const query = `
      SELECT r.*, 
             reporter.name as reporter_name,
             admin.name as admin_name
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.user_id
      LEFT JOIN users admin ON r.admin_id = admin.user_id
      ORDER BY r.created_at DESC
    `;
    
    const getReports = db.prepare(query);
    const reports = getReports.all();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports', authenticateToken, (req, res) => {
  try {
    const { reportedEntityId, reportType, content } = req.body;
    
    const insertReport = db.prepare('INSERT INTO reports (reporter_id, reported_entity_id, report_type, content) VALUES (?, ?, ?, ?)');
    const result = insertReport.run(req.user.userId, reportedEntityId, reportType, content);
    
    res.status(201).json({ reportId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/reports/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { status } = req.body;
    
    const updateReport = db.prepare('UPDATE reports SET status = ?, admin_id = ? WHERE report_id = ?');
    updateReport.run(status, req.user.userId, req.params.id);
    
    res.json({ message: 'Report updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== STATISTICS ROUTES (Admin Dashboard) =====
app.get('/api/stats/overview', authenticateToken, (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const getStats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'Porter') as total_porters,
        (SELECT COUNT(*) FROM trips) as total_trips,
        (SELECT COUNT(*) FROM trips WHERE status = 'Completed') as completed_trips,
        (SELECT COUNT(*) FROM reports WHERE status = 'Pending') as pending_reports
    `);
    const stats = getStats.get();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('\nTrekConnect Backend is ready!');
  console.log('================================');
  console.log('Default accounts:');
  console.log('- Admin: admin@trekconnect.vn / password123');
  console.log('- Leader: long@email.com / password123');
  console.log('- Porter: leb@email.com / password123');
  console.log('================================\n');
});
