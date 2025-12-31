const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'trekconnect.db');
let db = null;

// Wrapper class to provide better-sqlite3-like API
class PreparedStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  run(...params) {
    try {
      this.db.run(this.sql, params);
      return { lastInsertRowid: this.db.exec("SELECT last_insert_rowid()")[0].values[0][0] };
    } catch (err) {
      throw err;
    }
  }

  get(...params) {
    const result = this.db.exec(this.sql, params);
    if (!result || result.length === 0 || result[0].values.length === 0) {
      return null;
    }
    const row = result[0].values[0];
    const columns = result[0].columns;
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  }

  all(...params) {
    const result = this.db.exec(this.sql, params);
    if (!result || result.length === 0) {
      return [];
    }
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }
}

class Database {
  constructor(sqlDb) {
    this.sqlDb = sqlDb;
  }

  prepare(sql) {
    return new PreparedStatement(this.sqlDb, sql);
  }

  exec(sql) {
    this.sqlDb.exec(sql);
  }

  run(sql, params = []) {
    this.sqlDb.run(sql, params);
  }

  pragma(statement) {
    this.sqlDb.exec(`PRAGMA ${statement}`);
  }

  export() {
    return this.sqlDb.export();
  }
}

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Try to load existing database
  let sqlDb;
  try {
    const data = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(data);
  } catch (err) {
    // Database doesn't exist, create new one
    sqlDb = new SQL.Database();
  }

  const database = new Database(sqlDb);
  
  // Enable foreign keys
  database.pragma('foreign_keys = ON');

  // Create tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role TEXT CHECK(role IN ('User', 'Porter', 'Admin')) DEFAULT 'User',
      is_leader BOOLEAN DEFAULT 0,
      phone VARCHAR(20),
      address VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      location_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS trails (
      trail_id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL,
      name VARCHAR(200) NOT NULL,
      difficulty TEXT CHECK(difficulty IN ('Nhập môn', 'Cơ bản', 'Nâng cao', 'Thách thức', 'Cực khó')) NOT NULL,
      description TEXT,
      average_dist DECIMAL(6,2),
      average_time VARCHAR(50),
      altitude INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (location_id) REFERENCES locations(location_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      trip_id INTEGER PRIMARY KEY AUTOINCREMENT,
      leader_id INTEGER NOT NULL,
      trail_id INTEGER NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      max_participants INTEGER NOT NULL,
      need_porter BOOLEAN DEFAULT 0,
      registration_deadline DATETIME NOT NULL,
      status TEXT CHECK(status IN ('Draft', 'Pending', 'Finalized', 'In Process', 'Completed', 'Canceled')) DEFAULT 'Draft',
      estimated_cost DECIMAL(10,2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (leader_id) REFERENCES users(user_id),
      FOREIGN KEY (trail_id) REFERENCES trails(trail_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS participations (
      participation_id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT CHECK(role IN ('User', 'Porter')) DEFAULT 'User',
      status TEXT CHECK(status IN ('Pending', 'Confirmed', 'Declined', 'Canceled')) DEFAULT 'Pending',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(trip_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS porter_profiles (
      porter_id INTEGER PRIMARY KEY,
      bio TEXT,
      average_rating DECIMAL(3,2) DEFAULT 0.00,
      contact_info VARCHAR(200),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (porter_id) REFERENCES users(user_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS porter_service_areas (
      porter_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      PRIMARY KEY (porter_id, location_id),
      FOREIGN KEY (porter_id) REFERENCES users(user_id),
      FOREIGN KEY (location_id) REFERENCES locations(location_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS ratings (
      rating_id INTEGER PRIMARY KEY AUTOINCREMENT,
      rater_id INTEGER NOT NULL,
      rated_user_id INTEGER NOT NULL,
      trip_id INTEGER NOT NULL,
      rating_type TEXT CHECK(rating_type IN ('Porter', 'Leader')) NOT NULL,
      score INTEGER CHECK(score BETWEEN 1 AND 5) NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rater_id) REFERENCES users(user_id),
      FOREIGN KEY (rated_user_id) REFERENCES users(user_id),
      FOREIGN KEY (trip_id) REFERENCES trips(trip_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      report_id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      reported_entity_id INTEGER NOT NULL,
      report_type TEXT CHECK(report_type IN ('User', 'Trip')) NOT NULL,
      content TEXT NOT NULL,
      status TEXT CHECK(status IN ('Pending', 'Done', 'Dismissed')) DEFAULT 'Pending',
      admin_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reporter_id) REFERENCES users(user_id),
      FOREIGN KEY (admin_id) REFERENCES users(user_id)
    )
  `);

  // Insert sample data
  const hashedPassword = bcrypt.hashSync('password123', 10);
  
  // Check if data already exists
  const checkUsers = database.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = checkUsers.get();
  
  if (userCount.count === 0) {
    // Insert admin user
    const insertUser = database.prepare('INSERT INTO users (user_id, name, email, password, role) VALUES (?, ?, ?, ?, ?)');
    insertUser.run(1, 'Admin', 'admin@trekconnect.vn', hashedPassword, 'Admin');

    // Insert sample locations
    const insertLocations = database.prepare('INSERT INTO locations (location_id, name, description) VALUES (?, ?, ?)');
    insertLocations.run(1, 'Lào Cai', 'Vùng núi phía Bắc, nơi có đỉnh Fansipan');
    insertLocations.run(2, 'Lâm Đồng', 'Cao nguyên trung tâm, khí hậu mát mẻ');
    insertLocations.run(3, 'Nghệ An', 'Vùng núi miền Trung');

    // Insert sample trails
    const insertTrails = database.prepare('INSERT INTO trails (trail_id, location_id, name, difficulty, description, average_dist, average_time, altitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insertTrails.run(1, 1, 'Fansipan', 'Thách thức', 'Đỉnh núi cao nhất Việt Nam', 19, '3 ngày 2 đêm', 3143);
    insertTrails.run(2, 1, 'Sa Mu - U Bò', 'Nâng cao', 'Cung đường đẹp với nhiều thử thách', 15, '2 ngày 1 đêm', 2750);
    insertTrails.run(3, 2, 'Tà Năng - Phan Dũng', 'Cơ bản', 'Cung đường trekking nổi tiếng', 55, '2 ngày 1 đêm', 1800);

    // Insert sample users
    const insertSampleUsers = database.prepare('INSERT INTO users (user_id, name, email, password, role, is_leader) VALUES (?, ?, ?, ?, ?, ?)');
    insertSampleUsers.run(2, 'Nguyễn Kim Long', 'long@email.com', hashedPassword, 'User', 1);
    insertSampleUsers.run(3, 'Trần Văn A', 'trana@email.com', hashedPassword, 'User', 1);
    insertSampleUsers.run(4, 'Lê Thị B', 'leb@email.com', hashedPassword, 'Porter', 0);

    // Insert porter profile
    const insertPorterProfile = database.prepare('INSERT INTO porter_profiles (porter_id, bio, average_rating, contact_info) VALUES (?, ?, ?, ?)');
    insertPorterProfile.run(4, 'Porter có 5 năm kinh nghiệm tại khu vực Lào Cai', 4.8, '0123456789');

    // Insert porter service area
    const insertServiceArea = database.prepare('INSERT INTO porter_service_areas (porter_id, location_id) VALUES (?, ?)');
    insertServiceArea.run(4, 1);
    insertServiceArea.run(4, 3);

    // Insert sample trips
    const insertTrips = database.prepare('INSERT INTO trips (trip_id, leader_id, trail_id, title, description, start_date, end_date, max_participants, need_porter, registration_deadline, status, estimated_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertTrips.run(1, 2, 2, 'Leo núi Sa Mu - U Bò', 'Sa Mu không chỉ là một điểm săn mây lý tưởng mà còn là một bức tranh thiên nhiên hùng vĩ', '2025-04-15', '2025-04-17', 10, 1, '2025-04-07', 'Finalized', 1200000);
    insertTrips.run(2, 3, 1, 'Chinh phục Fansipan', 'Chinh phục nóc nhà Đông Dương', '2025-05-20', '2025-05-23', 12, 1, '2025-05-10', 'Pending', 2500000);
  
    console.log('Database initialized with sample data!');
  } else {
    console.log('Database loaded successfully!');
  }

  // Save database to file
  const data = database.export();
  fs.writeFileSync(dbPath, data);
  
  // Save on every change
  database.saveToFile = function() {
    const data = this.export();
    fs.writeFileSync(dbPath, data);
  };

  return database;
}

module.exports = { initDatabase };
