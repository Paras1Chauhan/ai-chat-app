let conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
let currentConvId = null;
let isLoading = false;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showToast(msg, color) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${color || '#f97316'};color:white;padding:10px 18px;border-radius:8px;font-size:13px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2)`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

function newChat() {
  currentConvId = null;
  const msgs = document.getElementById('messages');
  msgs.innerHTML = `
    <div class="welcome">
      <div class="welcome-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      </div>
      <h2>How can I help you today?</h2>
      <p>Blazing fast AI powered by <strong>Groq</strong> ⚡</p>
      <div class="suggestions">
        <button class="suggestion" onclick="useSuggestion('Explain quantum computing in simple terms')">🧪 Explain quantum computing</button>
        <button class="suggestion" onclick="useSuggestion('Write a Python function to sort a list')">🐍 Write Python code</button>
        <button class="suggestion" onclick="useSuggestion('What are the best practices for REST APIs?')">🌐 REST API best practices</button>
        <button class="suggestion" onclick="useSuggestion('Create a workout plan for beginners')">💪 Create a workout plan</button>
      </div>
    </div>`;
  document.getElementById('chatTitle').textContent = 'New Conversation';
  renderHistory();
}

function useSuggestion(text) {
  document.getElementById('userInput').value = text;
  sendMessage();
}

function renderHistory() {
  const el = document.getElementById('chatHistory');
  el.innerHTML = '';
  [...conversations].reverse().forEach(conv => {
    const div = document.createElement('div');
    div.className = 'history-item' + (conv.id === currentConvId ? ' active' : '');
    div.textContent = conv.title || 'New Conversation';
    div.onclick = () => loadConversation(conv.id);
    el.appendChild(div);
  });
}

function loadConversation(id) {
  const conv = conversations.find(c => c.id === id);
  if (!conv) return;
  currentConvId = id;
  document.getElementById('chatTitle').textContent = conv.title || 'Conversation';
  const msgs = document.getElementById('messages');
  msgs.innerHTML = '';
  conv.messages.forEach(m => appendMessage(m.role, m.content));
  renderHistory();
}

function getCurrentConv() {
  return conversations.find(c => c.id === currentConvId);
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function appendMessage(role, content) {
  const msgs = document.getElementById('messages');
  const welcome = msgs.querySelector('.welcome');
  if (welcome) welcome.remove();
  const div = document.createElement('div');
  div.className = `message ${role}`;
  const avatar = role === 'user' ? 'P' : '⚡';
  div.innerHTML = `
    <div class="avatar">${avatar}</div>
    <div class="bubble">${formatContent(content)}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function formatContent(text) {
  return text
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

async function sendMessage() {
  if (isLoading) return;
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text) return;

  isLoading = true;
  document.getElementById('sendBtn').disabled = true;
  input.value = '';
  input.style.height = 'auto';

  // Create new conversation if needed
  if (!currentConvId) {
    const conv = {
      id: generateId(),
      title: text.slice(0, 40) + (text.length > 40 ? '...' : ''),
      messages: []
    };
    conversations.push(conv);
    currentConvId = conv.id;
    document.getElementById('chatTitle').textContent = conv.title;
  }

  const conv = getCurrentConv();
  conv.messages.push({ role: 'user', content: text });
  appendMessage('user', text);
  renderHistory();

  // Typing indicator
  const msgs = document.getElementById('messages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message assistant';
  typingDiv.innerHTML = `<div class="avatar">⚡</div><div class="bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(typingDiv);
  msgs.scrollTop = msgs.scrollHeight;

  try {
    const model = document.getElementById('modelSelect').value;

    // Call our Vercel serverless function — API key is secured server-side
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: conv.messages.map(m => ({ role: m.role, content: m.content }))
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    const reply = data.choices[0].message.content;
    typingDiv.remove();
    appendMessage('assistant', reply);
    conv.messages.push({ role: 'assistant', content: reply });
    localStorage.setItem('conversations', JSON.stringify(conversations));

  } catch (err) {
    typingDiv.remove();
    const errDiv = appendMessage('assistant', '');
    errDiv.querySelector('.bubble').innerHTML = `<div class="error-msg">❌ ${err.message}</div>`;
    showToast('❌ ' + err.message);
  }

  isLoading = false;
  document.getElementById('sendBtn').disabled = false;
  input.focus();
}

window.onload = () => {
  renderHistory();
};
