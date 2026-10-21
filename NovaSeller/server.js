const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// Подключаемся к MongoDB (Railway сам подставит переменную MONGO_URL)
const mongoUri = process.env.MONGO_URL || 'mongodb://localhost:27017/discord';
mongoose.connect(mongoUri)
  .then(() => console.log('Успешное подключение к MongoDB'))
  .catch(err => console.error('Ошибка подключения к БД:', err));

// Создаем схему данных для сообщений
const MessageSchema = new mongoose.Schema({
    author: String,
    text: String,
    time: String,
    createdAt: { type: Date, default: Date.now, expires: 86400 } // Удалять сообщения через 24 часа
});
const Message = mongoose.model('Message', MessageSchema);

// 1. Прием вебхука от Discord
app.post('/discord-webhook', async (req, res) => {
    const { content, author, timestamp } = req.body;
    
    if (content) {
        try {
            const newMessage = new Message({
                author: author ? author.username : 'Система',
                text: content,
                time: new Date(timestamp).toLocaleTimeString('ru-RU')
            });
            await newMessage.save();
        } catch (err) {
            console.error('Ошибка сохранения:', err);
        }
    }
    res.sendStatus(200);
});

// 2. Отдача сообщений на сайт
app.get('/api/messages', async (req, res) => {
    try {
        // Берем последние 50 сообщений, сортируем по времени
        const messages = await Message.find().sort({ createdAt: -1 }).limit(50);
        res.json(messages.reverse());
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
