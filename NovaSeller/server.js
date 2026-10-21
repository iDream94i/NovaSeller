const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = '1561736046423711826'; // ID канала цены-скупщика

let latestMessage = { text: 'Сообщений пока нет', author: '', time: '' };

// Функция-помощник для безопасного извлечения текста (включая пересланные сообщения)
function extractText(message) {
    // 1. Если есть обычный текст, берем его
    if (message.content && message.content.trim() !== '') {
        return message.content;
    }
    
    // 2. Если сообщение пересланное, текст лежит в snapshots
    if (message.snapshots && message.snapshots.size > 0) {
        const snapshot = message.snapshots.first();
        if (snapshot && snapshot.content) {
            return snapshot.content;
        }
    }
    
    // 3. Если есть вложения или эмбеды, но нет текста
    if (message.embeds && message.embeds.length > 0) {
        const embed = message.embeds[0];
        return embed.description || embed.title || 'Текстовое описание отсутствует (Embed)';
    }

    return 'Пустое сообщение или неподдерживаемый формат';
}

client.once('ready', () => {
    console.log(`Робот ${client.user.tag} успешно запущен в сеть!`);
});

// Слушаем новые сообщения в реальном времени
client.on('messageCreate', (message) => {
    if (message.channel.id === CHANNEL_ID) {
        latestMessage = {
            author: message.author.username,
            text: extractText(message),
            time: new Date(message.createdTimestamp).toLocaleTimeString('ru-RU')
        };
    }
});

// Отдаем последнее сообщение на ваш сайт
app.get('/api/latest-message', async (req, res) => {
    try {
        if (latestMessage.author === '') {
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (channel) {
                const messages = await channel.messages.fetch({ limit: 1 });
                const last = messages.first();
                if (last) {
                    latestMessage = {
                        author: last.author.username,
                        text: extractText(last),
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
