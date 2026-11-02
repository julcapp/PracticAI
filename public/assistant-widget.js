'use strict';
(() => {
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/assistant-widget.css?v=20261102-scenarios'; document.head.append(css);
  const root = document.createElement('aside'); root.className = 'pa-chat'; root.setAttribute('aria-label', 'Помощь с выбором обучения');
  root.innerHTML = `<button class="pa-chat-button" type="button" aria-expanded="false" aria-controls="pa-chat-panel">Помочь с выбором</button>
    <section class="pa-chat-panel" id="pa-chat-panel" aria-label="Консультант PracticAI" hidden>
      <div class="pa-chat-head"><strong>Консультант PracticAI</strong><button class="pa-chat-close" type="button" aria-label="Закрыть">×</button></div>
      <div class="pa-chat-messages" role="log" aria-live="polite"></div>
      <div class="pa-chat-choices"><button type="button" data-question="Какие направления обучения есть?">Направления</button><button type="button" data-question="Я хочу записаться на курс. Что нужно сделать?">Запись на курс</button><button type="button" data-question="Есть ли программа для моей компании?">Для компаний</button></div>
      <form class="pa-chat-form"><input name="question" aria-label="Ваш вопрос" placeholder="Напишите вопрос" maxlength="800" required><button type="submit">Отправить</button></form>
      <details class="pa-lead"><summary>Отправить запрос на запись</summary><form>
        <label>Направление<select name="direction" required><option value="">Выберите направление</option><option>Для руководителей</option><option>Для коучей и тренеров</option><option>Для компаний</option><option>Для педагогов</option><option>Для юристов</option><option>Для бухгалтеров и финансистов</option><option>Другое направление</option></select></label>
        <label>Имя<input name="name" maxlength="100" required></label><label>Телефон<input name="phone" type="tel" maxlength="30" required></label><label>Email (необязательно)<input name="email" type="email" maxlength="150"></label>
        <label class="pa-consent"><input name="consent" type="checkbox" required><span>Согласен на обработку указанных данных ООО «Цифрономика» для ответа на запрос.</span></label>
        <button type="submit">Отправить запрос</button><p class="pa-lead-status" role="status"></p>
      </form></details><p class="pa-chat-note">Условия и наличие мест подтверждает менеджер. Не отправляйте личные данные в чат.</p>
    </section>`;
  document.body.append(root);
  const $ = selector => root.querySelector(selector);
  const panel = $('.pa-chat-panel'), toggle = $('.pa-chat-button'), messages = $('.pa-chat-messages');
  let busy = false, direction = "";
  const history = [];
  $('[name="direction"]').onchange = e => { direction = e.target.value; };
  function say(text, who) { const p = document.createElement('div'); p.className = 'pa-chat-message' + (who === 'user' ? ' user' : ''); p.textContent = text; messages.append(p); messages.scrollTop = messages.scrollHeight; return p; }
  function open() { panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); if (!messages.children.length) say('Здравствуйте! Помогу выбрать направление и оформить запрос на запись. Что вас интересует?'); $('.pa-chat-form input').focus(); }
  function close() { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
  toggle.onclick = () => panel.hidden ? open() : close(); $('.pa-chat-close').onclick = close;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });
  async function ask(question) {
    if (busy) return;
    busy = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    say(question, 'user'); const pending = say('Уточняю информацию…');
    const submit = $('.pa-chat-form button'); submit.disabled = true;
    for (const button of root.querySelectorAll('[data-question]')) button.disabled = true;
    try {
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ message: question, history, direction }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Не удалось получить ответ.');
      pending.textContent = data.answer;
      if (typeof data.direction === 'string') {
        direction = data.direction;
        $('[name="direction"]').value = direction;
      }
      if (Array.isArray(data.choices)) {
        const choices = $('.pa-chat-choices'); choices.replaceChildren();
        for (const choice of data.choices.slice(0, 4)) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = choice.label;
          button.dataset.question = choice.question; button.onclick = () => ask(choice.question); choices.append(button);
        }
      }
      if (data.showLead) { $('.pa-lead').open = true; }
      if (data.remember === true) history.push({ role: 'user', content: question }, { role: 'assistant', content: data.answer.slice(0, 800) });
      if (history.length > 8) history.splice(0, history.length - 8);
    } catch (err) { pending.textContent = err.message + ' Вы можете отправить запрос через форму ниже.'; }
    finally { clearTimeout(timeout); busy = false; submit.disabled = false; for (const button of root.querySelectorAll('[data-question]')) button.disabled = false; messages.scrollTop = messages.scrollHeight; }
  }
  $('.pa-chat-form').onsubmit = e => { e.preventDefault(); const input = $('.pa-chat-form input'); const value = input.value.trim(); if (value) { input.value = ''; ask(value); } };
  for (const button of root.querySelectorAll('[data-question]')) button.onclick = () => ask(button.dataset.question);
  $('.pa-lead form').onsubmit = async e => {
    e.preventDefault(); const form = e.currentTarget, button = form.querySelector('button'), status = $('.pa-lead-status');
    if (button.disabled || !form.reportValidity()) return;
    const fields = new FormData(form); button.disabled = true; status.textContent = 'Сохраняем запрос…';
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fields.get('name'), phone: fields.get('phone'), email: fields.get('email'),
          message: `Запрос на запись · направление: ${fields.get('direction')}. Условия и наличие мест требуют подтверждения менеджером.`, consent: fields.get('consent') === 'on' }) });
      const result = await response.json(); if (!response.ok || !Number.isInteger(result.id) || result.id < 1) throw new Error(result.error || 'Не удалось подтвердить сохранение запроса.');
      status.textContent = `Запрос №${result.id} получен. Менеджер уточнит программу и условия.`; form.reset(); direction = "";
    } catch (err) { status.textContent = err.message; } finally { button.disabled = false; }
  };
})();

