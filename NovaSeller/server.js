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
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;
const CHANNEL_ID = '1561736046423711826';

const PRICE_THRESHOLDS = {
    "Медь": 60,
    "Изумруд": 384,
    "Рубин": 799,
    "Алмаз": 4549,
    "Бензин": 219,
    "Солярка": 209,
    "Керосин": 214,
    "Фальшивые деньги": 10899,
    "Окунь": 53,
    "Карп": 399,
    "Форель": 629,
    "Лосось": 4249,
    "Жемчуг": 1649,
    "Шкура": 2239,
    "Идеальное мясо": 1679,
    "Хорошее мясо": 1099
};

const BUYER_NAMES = {
    1: 'Сэндик',
    2: 'Доки',
    3: 'Порт'
};

let latestMessage = { text: 'Сообщений пока нет', author: '', time: '' };

function extractText(message) {
    if (message.content && message.content.trim() !== '') {
        return message.content;
    }
    if (message.snapshots && message.snapshots.size > 0) {
        const snapshot = message.snapshots.first();
        if (snapshot && snapshot.content) {
            return snapshot.content;
        }
    }
    if (message.embeds && message.embeds.length > 0) {
        const embed = message.embeds[0];
        return embed.description || embed.title || 'Текстовое описание отсутствует (Embed)';
    }
    return 'Пустое сообщение или неподдерживаемый формат';
}

async function checkAndNotifyTelegram(text) {
    if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
        console.log('ОШИБКА: Не заданы TG_BOT_TOKEN или TG_CHAT_ID в настройках Render!');
        return;
    }
    if (!text) return;

    const lines = text.split('\n');
    let currentBuyer = 0;
    const goodDeals = [];

    const timeMatch = text.match(/(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})/);
    const updateTime = timeMatch ? timeMatch[1] : new Date().toLocaleTimeString('ru-RU');

    lines.forEach(line => {
        let trimmed = line.trim().replace(/\*/g, '');
        if (!trimmed) return;

        if (trimmed.includes('Скупщик сырья №1')) { currentBuyer = 1; return; }
        if (trimmed.includes('Скупщик сырья №2')) { currentBuyer = 2; return; }
        if (trimmed.includes('Скупщик сырья №3')) { currentBuyer = 3; return; }

        if (trimmed.startsWith('-') && currentBuyer > 0) {
            trimmed = trimmed.substring(1).trim();
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex !== -1) {
                const itemName = trimmed.substring(0, colonIndex).trim();
                const priceValue = trimmed.substring(colonIndex + 1).replace(/`/g, '').trim();

                const bracketMatch = priceValue.match(/\(([^)]+)\)/);
                if (bracketMatch && bracketMatch[1]) {
                    const digitsMatch = bracketMatch[1].match(/\d+/);
                    const bracketPrice = digitsMatch ? parseInt(digitsMatch[0], 10) : -1;
                    const threshold = PRICE_THRESHOLDS[itemName];

                    if (threshold && bracketPrice > threshold) {
                        goodDeals.push(`• <b>${itemName}</b> (${BUYER_NAMES[currentBuyer]}): ${priceValue}`);
                    }
                }
            }
        }
    });

    let tgMessage = `🔔 <b>Обновление цен (${updateTime})</b>\n\n`;
    
    if (goodDeals.length > 0) {
        tgMessage += `🔥 <b>Выгодные позиции этого часа:</b>\n` + goodDeals.join('\n');
    } else {
        tgMessage += `📉 В этом часе цен выше установленного порога нет.`;
    }

    try {
		const url = ['https:/', 'api.telegram.org', 'bot' + TG_BOT_TOKEN, 'sendMessage'].join('/');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TG_CHAT_ID,
                text: tgMessage,
                parse_mode: 'HTML'
            })
        });
        const result = await response.json();
        if (result.ok) {
            console.log('Уведомление успешно отправлено в Telegram!');
        } else {
            console.error('Ошибка от самого Telegram API:', result.description);
        }
    } catch (err) {
        console.error('Сетевая ошибка отправки в Telegram:', err);
    }
}

client.once('ready', async () => {
    console.log(`Робот ${client.user.tag} успешно запущен в сеть!`);
    
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (channel) {
            const messages = await channel.messages.fetch({ limit: 1 });
            const last = messages.first();
            if (last) {
                const extracted = extractText(last);
                latestMessage = {
                    author: last.author.username,
                    text: extracted,
                    time: new Date(last.createdTimestamp).toLocaleTimeString('ru-RU')
                };
                await checkAndNotifyTelegram(extracted);
            }
        }
    } catch (err) {
        console.error('Ошибка при стартовой проверке канала:', err);
    }
});

client.on('messageCreate', (message) => {
    if (message.channel.id === CHANNEL_ID) {
        const extracted = extractText(message);
        latestMessage = {
            author: message.author.username,
            text: extracted,
            time: new Date(message.createdTimestamp).toLocaleTimeString('ru-RU')
        };
        checkAndNotifyTelegram(extracted);
    }
});

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
        res.status(500).json({ error: 'Бот не может прочитать этот канал.' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

console.log('Начинаю авторизацию в Discord...');
client.login(BOT_TOKEN)
    .then(() => console.log('Успешный вход в Discord API'))
    .catch(err => console.error('Ошибка авторизации Discord бота:', err));
