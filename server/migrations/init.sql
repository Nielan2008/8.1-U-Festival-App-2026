-- initialize DB schema for loveu festival
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS acts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  stage VARCHAR(100),
  day VARCHAR(50),
  start_time VARCHAR(20),
  end_time VARCHAR(20),
  description TEXT,
  image_url TEXT,
  genre VARCHAR(100),
  lang VARCHAR(10) DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  body TEXT,
  image_url TEXT,
  published_at TIMESTAMP DEFAULT NOW(),
  lang VARCHAR(10) DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS schedule (
  id SERIAL PRIMARY KEY,
  act_id INTEGER REFERENCES acts(id) ON DELETE CASCADE,
  stage VARCHAR(100),
  day VARCHAR(50),
  start_time VARCHAR(20),
  end_time VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS info (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  lang VARCHAR(10) DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS map_points (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  type VARCHAR(100),
  description TEXT
);
