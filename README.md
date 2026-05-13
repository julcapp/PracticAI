# PracticAI — Node.js сервер

## Структура проекта
```
practicai-server/
├── server.js                  ← точка входа (Express)
├── db.js                      ← пул соединений MySQL
├── package.json
├── .env                       ← секреты (не в Git!)
├── .env.example               ← шаблон для .env
├── public/
│   └── index.html             ← сайт
├── routes/
│   ├── contact.js             ← POST /api/contact (форма)
│   └── health.js              ← GET  /api/health  (статус)
├── migrations/
│   └── 001_init.sql           ← создание таблиц в MySQL
└── .github/workflows/
    └── deploy.yml             ← CI/CD → hostland FTP
```

## Локальный запуск

```bash
npm install
cp .env.example .env   # заполнить пароли
npm run dev            # с авто-перезапуском (nodemon)
# или
npm start              # продакшн
```

Сервер: http://localhost:3000

## API

| Метод | URL            | Описание                  |
|-------|----------------|---------------------------|
| GET   | `/`            | Сайт (index.html)         |
| GET   | `/api/health`  | Статус сервера и БД       |
| POST  | `/api/contact` | Форма обратной связи      |

### POST /api/contact
```json
// Запрос
{ "name": "Иван", "phone": "+7 999 000-00-00", "email": "ivan@mail.ru", "message": "Хочу записаться" }

// Ответ 201
{ "success": true, "message": "Ваша заявка принята!", "id": 1 }
```

## Миграция БД (выполнить один раз)
Откройте **phpMyAdmin** на hostland.ru, выберите базу `host1688282_practicai`, вкладка **SQL** и выполните содержимое файла `migrations/001_init.sql`.

## Деплой
Один секрет в GitHub → `Settings → Secrets → Actions`:

| Name           | Value        |
|----------------|--------------|
| `FTP_PASSWORD` | FTP-пароль   |

После `git push` — автодеплой через GitHub Actions.

> ⚠️ Файл `.env` никогда не попадает в Git (добавлен в `.gitignore`).  
> На сервере создайте `.env` вручную через файловый менеджер hostland.
