import * as SQLite from 'expo-sqlite';

// Открываем БД
const db = SQLite.openDatabaseSync('games_hub.db');

export interface GameRecord {
  id: number;
  game_id: string;
  score: number;
  metadata: string;
  created_at: string;
}

export const initDatabase = () => {
  // Таблица очков
  db.execSync(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Таблица настроек (ключ-значение)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Установка начальной сложности, если её нет
  db.runSync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['sudoku_difficulty', 'EASY']);
  db.runSync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['sound_enabled', 'true']);
};

export const DatabaseService = {
  // --- РАБОТА С ОЧКАМИ ---
  saveScore: (gameId: string, score: number, additionalData: object = {}) => {
    const metadata = JSON.stringify(additionalData);
    db.runSync(
      'INSERT INTO scores (game_id, score, metadata) VALUES (?, ?, ?)',
      [gameId, score, metadata]
    );
  },

  getHighScore: (gameId: string): number => {
    const result = db.getFirstSync<{ score: number }>(
      'SELECT MAX(score) as score FROM scores WHERE game_id = ?',
      [gameId]
    );
    return result?.score || 0;
  },

  getMinScore: (gameId: string): number => {
    const result = db.getFirstSync<{ score: number }>(
      'SELECT MIN(score) as score FROM scores WHERE game_id = ?',
      [gameId]
    );
    return result?.score || 0;
  },

  getScore: (gameId: string): number => {
    const result = db.getFirstSync<{ score: number }>(
      'SELECT score FROM scores WHERE game_id = ? ORDER BY created_at DESC LIMIT 1',
      [gameId]
    );
    return result?.score ?? 0;
  },

  resetScore: (gameId: string) => {
    db.runSync(
      'DELETE FROM scores WHERE game_id = ?',
      [gameId]
    );
  },

  // --- РАБОТА С НАСТРОЙКАМИ ---
  setSetting: (key: string, value: string) => {
    db.runSync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  },

  getSetting: (key: string, defaultValue: string): string => {
    const result = db.getFirstSync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    return result ? result.value : defaultValue;
  },

  // Получить историю для игры
  getHistory: (gameId: string): GameRecord[] => {
    return db.getAllSync<GameRecord>(
      'SELECT * FROM scores WHERE game_id = ? ORDER BY created_at DESC LIMIT 10',
      [gameId]
    );
  },

};
