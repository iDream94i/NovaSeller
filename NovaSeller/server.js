const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Сюда вставляем URL вебхука, который вам дал админ чужого сервера
const DISCORD_WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://discord.com/api/webhooks/1561735828030361603/IDhItp-EqV8nu53MkPU6WlZT35JKbtbVs8RM-flj8daZSrOAHOI6L1groWn_KRT1Xg81';

// Превращаем URL вебхука в URL для чтения сообщений (дописываем /messages в конец)
const DISCORD_API_URL = `${DISCORD_WEBHOOK_URL}/messages`;

// Сюда наш сайт (index.html) будет обращаться за сообщениями
app.get('/api/messages', async (req, res) => {
    try {
        // Наш сервер сам делает запрос к Discord по ссылке вебхука
        const discordResponse = await fetch(DISCORD_API_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!discordResponse.ok) {
            return res.status(discordResponse.status).json({ error: 'Discord API вернул ошибку' });
        }

        const discordMessages = await discordResponse.json();

        // Форматируем сообщения для нашего сайта
        const formattedMessages = discordMessages.map(msg => ({
            author: msg.author ? msg.author.username : 'Система',
            text: msg.content,
            time: new Date(msg.timestamp).toLocaleTimeString('ru-RU')
        }));

        res.json(formattedMessages.reverse()); // Отдаем сообщения на сайт (новые внизу)
    } catch (err) {
        console.error('Ошибка запроса к Discord:', err);
        res.status(500).json({ error: 'Ошибка сервера при чтении Discord' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Сервер работает на порту ${PORT}`));
