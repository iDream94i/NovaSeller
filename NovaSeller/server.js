const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Подключение к PostgreSQL (Render сам передаст нужную ссылку в DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Обязательно для безопасности Render
});

// Создаем таблицу, если её еще нет
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        author TEXT,
        text TEXT,
        time TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('База данных PostgreSQL успешно инициализирована');
  } catch (err) {
    console.error('Ошибка создания таблицы:', err);
  }
};
initDb();

// 1. Прием вебхука от Discord
app.post('/discord-webhook', async (req, res) => {
    const { content, author, timestamp } = req.body;
    
    if (content) {
        try {
            const authorName = author ? author.username : 'Система';
            const timeString = new Date(timestamp).toLocaleTimeString('ru-RU');
            
            // Записываем сообщение в БД
            await pool.query(
                'INSERT INTO messages (author, text, time) VALUES (\$1, \$2, \$3)',
                [authorName, content, timeString]
            );

            // Очистка: удаляем сообщения старше 24 часов, чтобы не забивать память
            await pool.query("DELETE FROM messages WHERE created_at < NOW() - INTERVAL '1 day'");
        } catch (err) {
            console.error('Ошибка сохранения в БД:', err);
        }
    }
    res.sendStatus(200);
});

// 2. Отдача сообщений на сайт
app.get('/api/messages', async (req, res) => {
    try {
        // Берем последние 50 сообщений
        const result = await pool.query('SELECT author, text, time FROM messages ORDER BY id DESC LIMIT 50');
        res.json(result.rows.reverse()); // Переворачиваем, чтобы старые были сверху, новые снизу
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
