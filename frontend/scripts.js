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
let mode = 'analyze';
const tabs = [...document.querySelectorAll('[data-mode]')];
const modes = {
  analyze: { title: 'Your notes, in context.', description: 'Analyze with relevant knowledge. Your note is also saved to the database.', empty: "Connect today's notes with what you know.", help: 'Get a brief summary with relevant previous notes, changes, and recurring issues.', label: 'Note to analyze and save', placeholder: 'Paste meeting or project notes to analyze and save…', action: 'Analyze & save', progress: 'Analyzing', pending: 'Finding relevant notes and analyzing changes…', example: 'Website launch update: The homepage is complete. Mobile review found a navigation issue. The launch has moved from Friday to Monday.' },
  notes: { title: 'Grow your knowledge base.', description: 'Save notes and project knowledge to Qdrant for future searches and analysis.', empty: 'Keep knowledge for later.', help: 'Add meeting notes, decisions, or project information. Saved knowledge becomes available to search and analyze.', label: 'Knowledge to save', placeholder: 'Write or paste knowledge to store…', action: 'Save knowledge', progress: 'Saving', pending: 'Saving knowledge to the database…', example: 'Website project: The team agreed to launch on Friday. Maya owns the homepage and Alex handles copy and mobile review.' },
  search: { title: 'Find what you already know.', description: 'Search saved knowledge by meaning and see the closest matching notes.', empty: 'Start with a question or topic.', help: 'Search for a decision, project, or recurring issue in your knowledge base.', label: 'Search query', placeholder: 'What would you like to find in your knowledge base?', action: 'Search knowledge', progress: 'Searching', pending: 'Searching related knowledge…', example: 'What changed about the website launch?' },
};
const states = Object.fromEntries(Object.keys(modes).map(key => [key, { draft: '', nodes: [], error: '', status: 'Ready', statusClass: '' }]));

function switchMode(next) {
  if (busy || next === mode) return;
  Object.assign(states[mode], { draft: input.value, nodes: [...messages.querySelectorAll('.message')], error: errorMessage.hidden ? '' : errorMessage.textContent, status: statusText.textContent, statusClass: status.classList.contains('failed') ? 'failed' : '' });
  messages.querySelectorAll('.message').forEach(node => node.remove());
  mode = next;
  const config = modes[mode];
  const state = states[mode];
  messages.append(...state.nodes);
  input.value = state.draft;
  input.placeholder = config.placeholder;
  document.querySelector('#workspace-title').textContent = config.title;
  document.querySelector('#workspace-description').textContent = config.description;
  document.querySelector('#empty-title').textContent = config.empty;
  document.querySelector('#empty-description').textContent = config.help;
  document.querySelector('#input-label').textContent = config.label;
  sendButton.querySelector('span').textContent = config.action;
  document.querySelector('#workspace-panel').setAttribute('aria-labelledby', `tab-${mode}`);
  for (const tab of tabs) {
    tab.setAttribute('aria-selected', String(tab.dataset.mode === mode));
    tab.tabIndex = tab.dataset.mode === mode ? 0 : -1;
  }
  emptyState.hidden = state.nodes.length > 0;
  errorMessage.textContent = state.error;
  errorMessage.hidden = !state.error;
  setStatus(state.status, state.statusClass);
  updateControls();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined || busy) return;
    event.preventDefault();
    switchMode(tabs[next].dataset.mode);
    tabs[next].focus();
  });
});

function appendNotes(message, notes, title) {
  const section = document.createElement('section');
  section.className = 'knowledge-results';
  const heading = document.createElement('h3');
  heading.textContent = `${title} (${notes.length})`;
  section.append(heading);
  for (const note of notes) {
    const article = document.createElement('article');
    article.className = 'knowledge-note';
    const text = document.createElement('p');
    text.textContent = note.text;
    const meta = document.createElement('p');
    meta.className = 'knowledge-meta';
    meta.textContent = `Similarity score: ${note.score.toFixed(3)} · ID: ${note.id}`;
    article.append(text, meta);
    section.append(article);
  }
  message.querySelector('.message-body').append(section);
  messages.scrollTop = messages.scrollHeight;
}

function validNotes(notes) {
  return Array.isArray(notes) && notes.every(note => note && typeof note.text === 'string' && typeof note.id === 'string' && Number.isFinite(note.score));
}

function updateControls() {
  sendButton.disabled = busy || !input.value.trim();
  clearButton.disabled = busy || !messages.querySelector('.message');
  input.readOnly = busy;
  tabs.forEach(tab => { tab.disabled = busy; });
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
  input.value = modes[mode].example;
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
  setStatus(modes[mode].progress, 'processing');
  const userMessage = addMessage('user', text);
  const pendingMessage = addMessage('assistant', modes[mode].pending, true);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(`/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(response.status === 429
        ? 'Too many requests. Wait a moment and try again.'
        : `Could not complete the request (HTTP ${response.status}). Check the backend terminal before retrying.`);
    }
    const data = await response.json();
    if (mode === 'analyze' && (typeof data.result !== 'string' || !data.result.trim() || !validNotes(data.related_notes)) ||
        mode === 'search' && !validNotes(data.results) ||
        mode === 'notes' && (typeof data.id !== 'string' || !data.id.trim() || typeof data.message !== 'string')) {
      throw new Error('The server returned an unexpected response. Check the backend before retrying.');
    }
    pendingMessage.remove();
    if (mode === 'notes') {
      addMessage('assistant', `Knowledge saved to Qdrant.\nID: ${data.id}`);
    } else if (mode === 'search') {
      const result = addMessage('assistant', data.results.length ? 'Closest matches in your knowledge base.' : 'No saved knowledge found. Add knowledge in the Store knowledge tab, or try a different query.');
      if (data.results.length) appendNotes(result, data.results, 'Search results');
    } else {
      const result = addMessage('assistant', data.result);
      const notice = document.createElement('p');
      notice.className = 'knowledge-meta';
      notice.textContent = 'This note has also been saved to your knowledge base.';
      result.querySelector('.message-body').append(notice);
      if (data.related_notes.length) appendNotes(result, data.related_notes, 'Related previous notes');
      else {
        const empty = document.createElement('p');
        empty.className = 'knowledge-meta';
        empty.textContent = 'No previous notes were found for context.';
        result.querySelector('.message-body').append(empty);
      }
    }
    setStatus('Ready');
  } catch (error) {
    pendingMessage.remove();
    userMessage.remove();
    input.value = text;
    emptyState.hidden = Boolean(messages.querySelector('.message'));
    errorMessage.textContent = error.name === 'AbortError'
      ? 'The request timed out. The server may still finish it. Saving or analyzing again may create a duplicate note.'
      : error instanceof TypeError
        ? 'Connection lost. Make sure FastAPI is running. If saving or analyzing, the note may already have been stored; search before retrying.'
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
