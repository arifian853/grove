const form = document.querySelector('#message-form');
const input = document.querySelector('#message-input');
const messages = document.querySelector('#messages');
const emptyState = document.querySelector('#empty-state');
const sendButton = document.querySelector('#send-button');
const clearButton = document.querySelector('#clear-button');
const errorMessage = document.querySelector('#error-message');
const status = document.querySelector('#status');
const statusText = document.querySelector('#status-text');
let busy = false;

function updateControls() {
  sendButton.disabled = busy || !input.value.trim();
  clearButton.disabled = busy || !messages.querySelector('.message');
  input.readOnly = busy;
}

function setStatus(text, state = '') {
  statusText.textContent = text;
  status.className = `status-pill ${state}`;
}

function addMessage(role, text, pending = false) {
  const message = document.createElement('article');
  message.className = `message ${role}${pending ? ' pending' : ''}`;
  const label = document.createElement('p');
  label.className = 'message-label';
  label.textContent = role === 'user' ? 'You' : 'Grove';
  const body = document.createElement('div');
  body.className = 'message-body';
  const lines = text.trim().split('\n').filter(line => line.trim());
  if (role === 'assistant' && lines.length && lines.every(line => /^\s*[-*•]\s+/.test(line))) {
    const list = document.createElement('ul');
    for (const line of lines) {
      const item = document.createElement('li');
      item.textContent = line.replace(/^\s*[-*•]\s+/, '');
      list.append(item);
    }
    body.append(list);
  } else {
    body.textContent = text;
  }
  message.append(label, body);
  messages.append(message);
  emptyState.hidden = true;
  messages.scrollTop = messages.scrollHeight;
  return message;
}

input.addEventListener('input', updateControls);
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    if (!sendButton.disabled) form.requestSubmit();
  }
});

document.querySelector('#example-button').addEventListener('click', () => {
  input.value = 'Team meeting notes: We agreed to launch the new website on Friday. Maya will finish the homepage by Wednesday. Alex will review the copy and check the mobile layout on Thursday. The newsletter is postponed until next week so we can focus on the launch.';
  updateControls();
  input.focus();
});

clearButton.addEventListener('click', () => {
  if (busy) return;
  messages.querySelectorAll('.message').forEach(message => message.remove());
  emptyState.hidden = false;
  errorMessage.hidden = true;
  setStatus('Ready');
  updateControls();
  input.focus();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || busy) return;
  busy = true;
  errorMessage.hidden = true;
  input.value = '';
  updateControls();
  setStatus('Summarizing', 'processing');
  const userMessage = addMessage('user', text);
  const pendingMessage = addMessage('assistant', 'Finding the key points…', true);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(response.status === 429
        ? 'Too many requests. Wait a moment and try again.'
        : 'The summary could not be created. Check the backend terminal and try again.');
    }
    const data = await response.json();
    if (typeof data.result !== 'string' || !data.result.trim()) {
      throw new Error('No summary was returned. Try sending your message again.');
    }
    pendingMessage.remove();
    addMessage('assistant', data.result);
    setStatus('Ready');
  } catch (error) {
    pendingMessage.remove();
    userMessage.remove();
    input.value = text;
    emptyState.hidden = Boolean(messages.querySelector('.message'));
    errorMessage.textContent = error.name === 'AbortError'
      ? 'This is taking longer than expected. Try sending your message again.'
      : error instanceof TypeError
        ? 'Could not reach the server. Make sure FastAPI is running, then try again.'
        : error.message;
    errorMessage.hidden = false;
    setStatus('Try again', 'failed');
  } finally {
    clearTimeout(timeout);
    busy = false;
    updateControls();
    input.focus();
  }
});
