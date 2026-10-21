const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Точный URL вебхука, который создали админы
const DISCORD_API_URL = 'https://discord.com';

app.get('/api/latest-message', async (req, res) => {
    try {
        // Запрашиваем сообщения из канала объявлений через вебхук
        const discordResponse = await fetch(DISCORD_API_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!discordResponse.ok) {
            return res.status(discordResponse.status).json({ error: 'Discord запретил доступ. Проверьте, сделан ли канал объявлением.' });
        }

        const discordMessages = await discordResponse.json();

        if (discordMessages.length === 0) {
            return res.json({ text: 'В канале пока нет сообщений', author: '', time: '' });
        }

        // Берем самое первое сообщение из массива (Discord возвращает их от новых к старым)
        const latest = discordMessages[0];

        res.json({
            author: latest.author ? latest.author.username : 'Система',
            text: latest.content,
            time: new Date(latest.timestamp).toLocaleTimeString('ru-RU')
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера на Render' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Сервер запущен`));
