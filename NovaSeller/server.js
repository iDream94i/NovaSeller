const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
app.use(cors());
app.use(express.json());

// Настраиваем бота Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = '1561736046423711826'; // ID вашего канала

let latestMessage = { text: 'Сообщений пока нет', author: '', time: '' };

client.once('ready', () => {
    console.log(`Робот ${client.user.tag} успешно запущен в сеть!`);
});

// Ловим новые сообщения из чата в реальном времени
client.on('messageCreate', (message) => {
    if (message.channel.id === CHANNEL_ID) {
        latestMessage = {
            author: message.author.username,
            text: message.content,
            time: new Date(message.createdTimestamp).toLocaleTimeString('ru-RU')
        };
    }
});

// Отдаем последнее сообщение на ваш сайт
app.get('/api/latest-message', async (req, res) => {
    try {
        // Если сервер только включился, принудительно берем 1 последнее сообщение из истории
        if (latestMessage.author === '') {
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (channel) {
                const messages = await channel.messages.fetch({ limit: 1 });
                const last = messages.first();
                if (last) {
                    latestMessage = {
                        author: last.author.username,
                        text: last.content,
                        time: new Date(last.createdTimestamp).toLocaleTimeString('ru-RU')
                    };
                }
            }
        }
        res.json(latestMessage);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Бот не может прочитать этот канал. Проверьте права доступа бота в Discord.' });
    }
});

client.login(BOT_TOKEN).then(() => {
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => console.log(`Сервер запущен`));
});
