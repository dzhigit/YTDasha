const { LiveChat } = require("youtube-chat");
const axios = require("axios");

// === НАСТРОЙКИ ===
const VIDEO_ID = "JhcWIgWfYtM"; // Вставь сюда ID стрима (например, jfKfPfyJRdk)
const VIEWER_UPDATE_INTERVAL = 30000; // Как часто проверять онлайн (30 сек)

// === ПЕРЕМЕННЫЕ ДЛЯ СТАТИСТИКИ ===
let totalMessagesCount = 0;
let currentViewers = "Неизвестно";
const messagesList = []; // Сюда складываем все сообщения

// Инициализация чата
const liveChat = new LiveChat({ liveId: VIDEO_ID });

// Функция для получения текста сообщения (склеивает текст и смайлы)
function getMessageText(messageItems) {
    return messageItems.map(item => item.text || item.emojiText || '').join('');
}

// === ФУНКЦИЯ ПОЛУЧЕНИЯ ОНЛАЙНА ===
// Она скачивает HTML-код страницы YouTube и ищет там текущий онлайн
// === ФУНКЦИЯ ПОЛУЧЕНИЯ ОНЛАЙНА (ОБНОВЛЕННАЯ) ===
async function fetchViewers() {
    try {
        // 1. Притворяемся настоящим браузером (Chrome на Windows)
        const response = await axios.get(`https://www.youtube.com/watch?v=${VIDEO_ID}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9" // Просим Ютуб отвечать на английском, чтобы формат цифр был предсказуемым
            }
        });

        const html = response.data;

        // 2. Ютуб хранит онлайн в разных местах. Пробуем несколько вариантов:
        const patterns = [
            /"concurrentViewers":{"runs":\[{"text":"([^"]+)"}\]}/, // Вариант 1 (Стандартный)
            /"viewCount":{"videoViewCountRenderer":{"viewCount":{"runs":\[{"text":"([^"]+)"}/, // Вариант 2 (В рендерере)
            /"shortViewCount":{"simpleText":"([^"]+)"}/, // Вариант 3 (Короткий текст)
            /"shortViewCount":{"runs":\[{"text":"([^"]+)"}/ // Вариант 4 (Короткий текст с runs)
        ];

        let isFound = false;

        for (let regex of patterns) {
            const match = html.match(regex);
            if (match && match[1]) {
                // Очищаем результат от текста и запятых (например, "1,524 watching" -> "1524")
                currentViewers = match[1].replace(/[^0-9]/g, ''); 
                
                // Если Ютуб отдал пустую строку после очистки, пропускаем
                if (currentViewers !== '') {
                    console.log(`\n👁️ [ОБНОВЛЕНИЕ] Текущий онлайн: ${currentViewers} зрителей\n`);
                    isFound = true;
                    break; // Нашли онлайн - выходим из цикла
                }
            }
        }

        if (!isFound) {
            console.log("\n⚠️ [ОБНОВЛЕНИЕ] Не удалось найти блок с онлайном. Попробуем снова через 30 сек...\n");
        }

    } catch (error) {
        console.error("\n❌ Ошибка при получении онлайна:", error.message);
    }
}

// === СЛУШАЕМ ЧАТ ===
liveChat.on("chat", (chatItem) => {
    totalMessagesCount++; // Увеличиваем счетчик
    
    const author = chatItem.author.name;
    const text = getMessageText(chatItem.message);
    const time = new Date(chatItem.timestamp).toLocaleTimeString();

    // Записываем в наш массив сообщений
    messagesList.push({
        time: time,
        author: author,
        text: text
    });

    // Выводим в консоль
    console.log(`[${time}] ${author}: ${text}`);
});

// === ЗАПУСК ПРИЛОЖЕНИЯ ===
async function startApp() {
    console.log(`Подключение к трансляции ${VIDEO_ID}...`);
    
    const ok = await liveChat.start();
    if (!ok) {
        console.log("❌ Не удалось подключиться к чату. Проверь ID или статус трансляции.");
        return;
    }

    console.log("✅ Подключено! Читаем чат...");
    
    // Сразу запрашиваем онлайн при старте
    await fetchViewers();
    // И затем запрашиваем его каждые 30 секунд
    setInterval(fetchViewers, VIEWER_UPDATE_INTERVAL);
}

startApp();

// === ОБРАБОТКА ОСТАНОВКИ (ВЫВОД ИТОГОВ) ===
process.on('SIGINT', () => {
    console.log("\n\n========================================");
    console.log("🛑 СБОР ДАННЫХ ОСТАНОВЛЕН");
    console.log("========================================");
    console.log(`▶ Последний зафиксированный онлайн: ${currentViewers} чел.`);
    console.log(`▶ Всего собрано сообщений: ${totalMessagesCount}`);
    
    // Выведем 5 последних сообщений для примера
    console.log("\n▶ Последние 5 сообщений из базы:");
    const last5 = messagesList.slice(-5);
    last5.forEach(msg => {
        console.log(`  - ${msg.author}: ${msg.text}`);
    });
    console.log("========================================");

    process.exit();
});