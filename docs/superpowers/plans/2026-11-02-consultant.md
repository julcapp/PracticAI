# Consultant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** редактируемые сценарии, тестирование в CRM и перевод посетителя к заявке.
**Architecture:** чистая функция выбора сценария, MySQL-хранилище и защищённые маршруты CRM; публичный виджет использует структурированные кнопки и направление.
**Tech Stack:** Node.js, Express, MySQL, vanilla JavaScript, node:test.
**Spec:** docs/superpowers/specs/2026-11-02-consultant-design.md

## Global Constraints
- Без внешних AI-запросов. Только подтверждённые условия.
- Личные данные вводятся в отдельной форме с согласием.
- Сохранять существующие данные и маршруты CRM.

## Review Focus
- Выключенные сценарии не отвечают; пустая база не восстанавливает удалённые сценарии.
- Уточнение о цене сохраняет тему, явное другое направление её меняет.
- Контакты в чате не записываются в историю.
- Ошибки загрузки/сохранения не теряют текст и не показывают ложный успех.
- Ответы с HTML отображаются текстом; в тестовом режиме нет записи в базу.

### Task 1: сценарии и хранилище
**Files:** consultant/engine.js, consultant/store.js, tests/consultant.test.js, routes/assistant.js.
**Interfaces:** answer(message, history, scenarios, direction) => {answer, direction, choices, showLead}; loadScenarios() => rows; validateScenario(data) => boolean.
- [x] Написать и запустить падающие тесты выбора направления, уточнений, отключения и валидации.
- [x] Реализовать движок, идемпотентное создание базы и первичное заполнение под транзакцией.
- [x] Заменить внешний AI-маршрут локальным движком и выполнить node --test.

### Task 2: редактор CRM
**Files:** routes/admin.js, views/admin.html, tests/consultant-api.test.js.
**Interfaces:** GET/POST /api/admin/scenarios, PUT/DELETE /api/admin/scenarios/:id, POST /api/admin/scenarios/preview.
- [x] Проверить авторизацию, валидацию, изменение и тест несохранённого ответа через HTTP.
- [x] Добавить CRUD, форму, список и тестовый диалог. Не вставлять ответы в innerHTML.
- [x] Запустить тесты и проверку синтаксиса скриптов.

### Task 3: виджет, публикация, синхронизация
**Files:** public/assistant-widget.js, .github/workflows/deploy.yml, CRM.md.
**Interfaces:** виджет передаёт direction и использует choices, showLead, remember из ответа API.
- [x] Добавить тематические кнопки и автоподстановку направления; ограничить историю восемью сообщениями по 800 символов.
- [x] Проверить успешную и неуспешную заявку, сохранение формы при ошибке.
- [x] Прогнать тесты перед FTP в workflow, проверить сценарии после публикации.
- [ ] Зафиксировать изменения в GitHub, подтвердить выкладку и синхронизировать Home-Boss fast-forward.
