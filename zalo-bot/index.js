require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const OA_ID = process.env.OA_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const ZALO_API = 'https://openapi.zalo.me/v2.0/oa';

app.use(express.json());

function verifyWebhook(req) {
  if (!WEBHOOK_SECRET) return true;
  const mac = crypto.createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return req.headers['x-zalo-signature'] === mac;
}

async function sendMessage(userId, text) {
  try {
    const res = await axios.post(`${ZALO_API}/message`, {
      recipient: { user_id: userId },
      message: { text }
    }, {
      headers: {
        'access_token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    return res.data;
  } catch (err) {
    console.error('Send message error:', err.response?.data || err.message);
  }
}

async function sendTemplate(userId, payload) {
  try {
    const res = await axios.post(`${ZALO_API}/message`, {
      recipient: { user_id: userId },
      message: payload
    }, {
      headers: {
        'access_token': ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    return res.data;
  } catch (err) {
    console.error('Send template error:', err.response?.data || err.message);
  }
}

// Webhook xác thực từ Zalo (GET)
app.get('/webhook', (req, res) => {
  const challenge = req.query.challenge;
  if (challenge) {
    return res.status(200).json({ challenge });
  }
  res.sendStatus(200);
});

// Webhook nhận tin nhắn (POST)
app.post('/webhook', async (req, res) => {
  if (!verifyWebhook(req)) {
    return res.sendStatus(401);
  }

  console.log('Webhook received:', JSON.stringify(req.body, null, 2));
  const event = req.body;

  if (event.event_name === 'user_send_text') {
    const userId = event.sender.id;
    const message = event.message.text;
    const reply = handleMessage(message);

    await sendMessage(userId, reply);
  }

  res.sendStatus(200);
});

function handleMessage(text) {
  const msg = text.toLowerCase().trim();

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('chào')) {
    return 'Chào bạn! Tôi là bot Zalo. Bạn cần gì ạ?\n\n' +
           'Các lệnh:\n' +
           '• /help - Xem hướng dẫn\n' +
           '• /time - Xem giờ\n' +
           '• /echo [nội dung] - Lặp lại tin nhắn';
  }

  if (msg.startsWith('/help')) {
    return 'Danh sách lệnh:\n' +
           '/help - Xem hướng dẫn\n' +
           '/time - Xem giờ hiện tại\n' +
           '/echo <nội dung> - Bot sẽ lặp lại\n' +
           '/info - Thông tin bot';
  }

  if (msg.startsWith('/time')) {
    const now = new Date();
    return '🕐 ' + now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  }

  if (msg.startsWith('/echo ')) {
    return msg.slice(6);
  }

  if (msg.startsWith('/info')) {
    return '🤖 Zalo Bot Demo\n' +
           'Version: 1.0.0\n' +
           'Nền tảng: Node.js + Express';
  }

  return `Bạn vừa nói: "${text}"\nGõ /help để xem danh sách lệnh.`;
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Zalo Bot is running!' });
});

app.listen(PORT, () => {
  console.log(`Zalo Bot running on http://localhost:${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
});
