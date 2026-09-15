const { Client, GatewayIntentBits, AttachmentBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const express = require('express');
const app = express();

// سيرفر أونلاين بسيط للـ Uptime
app.get('/', (req, res) => res.send('Bot is active and running 24/7!'));
app.listen(3000, () => console.log('Web server is ready on port 3000'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// قاعدة بيانات بسيطة مؤقتة (تخزين الـ XP واللفلات)
const userData = new Map();

function getUserStats(userId) {
    if (!userData.has(userId)) {
        userData.set(userId, {
            textXp: 0,
            textLevel: 0,
            voiceXp: 0,
            voiceLevel: 0
        });
    }
    return userData.get(userId);
}

// حساب الـ XP المطلوبة للفل القادم (تبدأ من 125 وتتضاعف في 2 مع كل لفل)
function getRequiredXp(level) {
    return 125 * Math.pow(2, level);
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // تسجيل أمر /rank
    const commands = [
        new SlashCommandBuilder()
            .setName('rank')
            .setDescription('عرض بطاقة الرانك الخاصة بك')
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered slash commands.');
    } catch (error) {
        console.error(error);
    }
});

// استقبال أمر /rank ورسم الصورة
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'rank') {
        await interaction.deferReply();

        const user = interaction.user;
        const stats = getUserStats(user.id);

        const canvas = createCanvas(900, 350);
        const ctx = canvas.getContext('2d');

        // 1. رسم الخلفية البنفسجية الداكنة نفس تصميمك
        ctx.fillStyle = '#181427';
        ctx.beginPath();
        ctx.roundRect(0, 0, 900, 350, 20);
        ctx.fill();

        // الإطار الخارجي البنفسجي الفاتح
        ctx.strokeStyle = '#8a5cf5';
        ctx.lineWidth = 4;
        ctx.stroke();

        // 2. كتابة اسم الشخص مكان MD
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.fillText(user.displayName, 50, 65);

        ctx.fillStyle = '#a29bfe';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('DISCORD RANK', 50, 95);

        // حساب المتطلبات
        const textReq = getRequiredXp(stats.textLevel);
        const voiceReq = getRequiredXp(stats.voiceLevel);

        // 3. قسم Text Chat
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('TEXT CHAT', 50, 150);
        ctx.fillText(`LEVEL ${stats.textLevel} • ${stats.textXp} TOTAL XP`, 530, 150);

        // خلفية شريط النص
        ctx.fillStyle = '#2d264a';
        ctx.beginPath();
        ctx.roundRect(50, 170, 600, 25, 12);
        ctx.fill();

        // تعبئة شريط النص بناءً على الـ XP
        const textProgress = Math.min(stats.textXp / textReq, 1);
        ctx.fillStyle = '#a259ff';
        ctx.beginPath();
        ctx.roundRect(50, 170, 600 * textProgress, 25, 12);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`${stats.textXp} / ${textReq}`, 350, 188);

        // 4. قسم Voice
        ctx.fillText('VOICE', 50, 240);
        ctx.fillText(`LEVEL ${stats.voiceLevel} • ${stats.voiceXp} TOTAL XP`, 530, 240);

        // خلفية شريط الفويس
        ctx.fillStyle = '#2d264a';
        ctx.beginPath();
        ctx.roundRect(50, 260, 600, 25, 12);
        ctx.fill();

        // تعبئة شريط الفويس
        const voiceProgress = Math.min(stats.voiceXp / voiceReq, 1);
        ctx.fillStyle = '#a259ff';
        ctx.beginPath();
        ctx.roundRect(50, 260, 600 * voiceProgress, 25, 12);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${stats.voiceXp} / ${voiceReq}`, 350, 278);

        // 5. رسم صورة البروفايل الدائرية للشخص نفسه
        try {
            const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await loadImage(avatarUrl);
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(775, 175, 95, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 680, 80, 190, 190);
            ctx.restore();

            // إطار دائري حول الصورة
            ctx.strokeStyle = '#a259ff';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(775, 175, 95, 0, Math.PI * 2, true);
            ctx.stroke();
        } catch (err) {
            console.log('Error loading avatar:', err);
        }

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
        await interaction.reply({ files: [attachment] });
    }
});

// احتساب XP للمراسلات (يربح عشوائياً بين 5 إلى 15 XP لكل رسالة)
client.on('messageCreate', message => {
    if (message.author.bot) return;
    const stats = getUserStats(message.author.id);
    
    stats.textXp += Math.floor(Math.random() * 11) + 5;
    const req = getRequiredXp(stats.textLevel);
    if (stats.textXp >= req) {
        stats.textLevel++;
    }
});

client.login(process.env.TOKEN);
