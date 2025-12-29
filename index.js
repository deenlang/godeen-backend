// .env faylni o‘qish
require('dotenv').config();

// Telegram bot kutubxonasi
const TelegramBot = require('node-telegram-bot-api');

// Supabase client
const { createClient } = require('@supabase/supabase-js');

// Botni ishga tushirish
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Supabase ulanish
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Vaqtincha registratsiya bosqichlari
const step = {};

// /start komandasi
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🚖 GODEEN TAXI\nHaydovchi ro‘yxatdan o‘tish\n\nTelefon raqamingizni yuboring",
    {
      reply_markup: {
        keyboard: [
          [{ text: "📱 Telefon yuborish", request_contact: true }]
        ],
        resize_keyboard: true
      }
    }
  );
});

// Telefon kelganda
bot.on("contact", async (msg) => {
  const chatId = msg.chat.id;
  const phone = msg.contact.phone_number;

  // Oldin bor-yo‘qligini tekshiramiz
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phone)
    .single();

  if (data) {
    return bot.sendMessage(chatId, "❗ Siz allaqachon ro‘yxatdan o‘tgansiz");
  }

  // Telefonni saqlab turamiz
  step[chatId] = { phone };

  bot.sendMessage(chatId, "👤 Ism familiyangizni yozing");
});

// Ism kelganda
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // Agar bu foydalanuvchi registratsiyada bo‘lmasa
  if (!step[chatId] || msg.contact) return;

  // Ismni saqlaymiz
  step[chatId].name = msg.text;

  const d = step[chatId];

  // Users jadvaliga yozamiz
  const { data: user } = await supabase
    .from("users")
    .insert({
      role: "driver",
      name: d.name,
      phone: d.phone
    })
    .select()
    .single();

  // Drivers jadvaliga yozamiz
  await supabase.from("drivers").insert({
    user_id: user.id
  });

  // Javob
  bot.sendMessage(
    chatId,
    "✅ Ro‘yxatdan o‘tdingiz!\n⏳ Admin tasdiqlashini kuting",
    { reply_markup: { remove_keyboard: true } }
  );

  // Tozalaymiz
  delete step[chatId];
});