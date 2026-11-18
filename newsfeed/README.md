# 📰 Персональная лента новостей

Персональная лента новостей на Cloudflare Workers. Бесплатно, без API-ключей.

## Возможности
- 🎨 Красивый интерфейс (тёмная/светлая тема)
- 🏷️ Управление темами — добавляй, удаляй, выбирай из предложенных
- 📰 Новости из Google News RSS по твоим темам (на русском)
- 💾 Настройки сохраняются в Workers KV
- 📱 Адаптивный дизайн (телефон/планшет/десктоп)

## Установка (5 минут)

### 1. Установи Node.js
Если не установлен — скачай с https://nodejs.org (версия 18+)

### 2. Клонируй репозиторий
```bash
git clone <команда из карточки ниже>
cd newsfeed
npm install
```

### 3. Войди в Cloudflare
```bash
npx wrangler login
```
Откроется браузер — авторизуйся тем же аккаунтом Cloudflare.

### 4. Создай KV-неймспейс
```bash
npx wrangler kv namespace create NEWS_KV
```
В выводе будет строка вида `id = "abc123..."` — скопируй этот ID.

### 5. Впиши ID в wrangler.jsonc
Открой `wrangler.jsonc` и замени `PLACEHOLDER_KV_ID` на скопированный ID:
```jsonc
{
  "kv_namespaces": [
    {
      "binding": "NEWS_KV",
      "id": "твой-скопированный-id"
    }
  ]
}
```

### 6. Деплой!
```bash
npx wrangler deploy
```

Готово! Wrangler покажет URL вида:
```
https://newsfeed.<твой-сабдомен>.workers.dev
```

Открывай — приложение работает! 🎉

## Локальная разработка
```bash
npx wrangler kv namespace create NEWS_KV --env=""  # для локального
npx wrangler dev
```
Приложение будет на http://localhost:8787

## Как это работает
- **Frontend** — HTML/CSS/JS в одном файле, отдаётся Worker'ом
- **Backend** — Cloudflare Worker с API-эндпоинтами `/api/topics` и `/api/news`
- **Хранилище** — Workers KV хранит список тем
- **Новости** — Google News RSS (`news.google.com/rss/search?q=ТЕМА&hl=ru`), кэшируется 5 минут

## Стоимость
Полностью бесплатно. Free план Cloudflare включает:
- 100 000 запросов к Worker в день
- 100 000 операций KV в день
- 1 ГБ хранилища KV
