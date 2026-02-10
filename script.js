const chatBox = document.getElementById('chat-box');
const apiKeyInput = document.getElementById('api-key');
const personaInput = document.getElementById('persona-input');
const modelSelect = document.getElementById('model-select');
const colorUserInput = document.getElementById('color-user');
const colorAiInput = document.getElementById('color-ai');
const botNameInput = document.getElementById('bot-name-input');
const displayBotName = document.getElementById('display-bot-name');
const sidebar = document.getElementById('sidebar');

let currentChatId = Date.now().toString();
let allChats = JSON.parse(localStorage.getItem('iki_ai_history') || '{}');

const urlParams = new URLSearchParams(window.location.search);
const configData = urlParams.get('c');

if (configData) {
    sidebar.classList.add('hidden');
    try {
        const decoded = JSON.parse(atob(configData));
        personaInput.value = decoded.persona || "";
        modelSelect.value = decoded.model || "gemini-1.5-flash";
        colorUserInput.value = decoded.cUser || "#007bff";
        colorAiInput.value = decoded.cAi || "#333333";
        botNameInput.value = decoded.name || "AI Assistant";
        displayBotName.innerText = decoded.name || "AI Assistant";

        let savedKey = localStorage.getItem('user_api_key');
        if (!savedKey) {
            savedKey = prompt("Masukkan API Key Anda untuk mulai:");
            if (savedKey) localStorage.setItem('user_api_key', savedKey);
        }
        apiKeyInput.value = savedKey;
    } catch (e) { alert("Link Error!"); }
} else {
    apiKeyInput.value = localStorage.getItem('last_api_key') || '';
}

function saveToHistory(sender, text, name) {
    if (!allChats[currentChatId]) {
        allChats[currentChatId] = { title: text.substring(0, 30) + "...", messages: [] };
    }
    allChats[currentChatId].messages.push({ sender, text, name });
    localStorage.setItem('iki_ai_history', JSON.stringify(allChats));
    renderHistoryList();
}

function renderHistoryList() {
    const list = document.getElementById('history-list');
    list.innerHTML = "";
    Object.keys(allChats).reverse().forEach(id => {
        const item = document.createElement('div');
        item.className = `history-item ${id === currentChatId ? 'active' : ''}`;
        item.innerText = allChats[id].title;
        item.onclick = () => loadChat(id);
        list.appendChild(item);
    });
}

function loadChat(id) {
    currentChatId = id;
    chatBox.innerHTML = "";
    allChats[id].messages.forEach(msg => {
        renderMessageUI(msg.sender, msg.text, msg.sender === 'user' ? colorUserInput.value : colorAiInput.value, msg.name);
    });
    renderHistoryList();
}

function renderMessageUI(sender, text, color, name) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.style.backgroundColor = color;
    if (sender === 'ai') {
        msgDiv.innerHTML = `<strong>${name}</strong>${marked.parse(text)}`;
        msgDiv.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
    } else {
        msgDiv.innerHTML = `<strong>${name}</strong><br>${text}`;
    }
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const msgInput = document.getElementById('user-msg');
    const text = msgInput.value.trim();
    const key = apiKeyInput.value;
    const model = modelSelect.value;
    const botName = botNameInput.value || "AI";
    
    if (!text || !key) return;

    renderMessageUI('user', text, colorUserInput.value, "Kamu");
    saveToHistory('user', text, "Kamu");
    msgInput.value = '';

    const typingId = "typing-" + Date.now();
    appendTyping(typingId, colorAiInput.value);

    try {
        let responseText = "";
        if (model.includes('gemini')) {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Instruction: ${personaInput.value}\n\nUser: ${text}` }] }] })
            });
            const data = await res.json();
            responseText = data.candidates[0].content.parts[0].text;
        } else {
            const url = model.includes('gpt') ? 'https://api.openai.com/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions';
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: model, messages: [{ role: "system", content: personaInput.value }, { role: "user", content: text }] })
            });
            const data = await res.json();
            responseText = data.choices[0].message.content;
        }

        document.getElementById(typingId).remove();
        renderMessageUI('ai', responseText, colorAiInput.value, botName);
        saveToHistory('ai', responseText, botName);
    } catch (err) {
        if(document.getElementById(typingId)) document.getElementById(typingId).remove();
        renderMessageUI('ai', "Error: Periksa API Key Anda.", "#aa0000", "System");
    }
}

function appendTyping(id, color) {
    const div = document.createElement('div');
    div.id = id;
    div.className = "message ai";
    div.style.backgroundColor = color;
    div.innerHTML = `<div class="typing"><span></span><span></span><span></span></div>`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-msg').addEventListener('keydown', (e) => { 
    if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault();
        sendMessage(); 
    } 
});

document.getElementById('save-config').addEventListener('click', () => {
    localStorage.setItem('last_api_key', apiKeyInput.value);
    const config = { name: botNameInput.value, persona: personaInput.value, model: modelSelect.value, cUser: colorUserInput.value, cAi: colorAiInput.value };
    const shareLink = `${window.location.origin}${window.location.pathname}?c=${btoa(JSON.stringify(config))}`;
    document.getElementById('share-url').value = shareLink;
    document.getElementById('share-link-container').classList.remove('hidden');
    displayBotName.innerText = botNameInput.value;
});

document.getElementById('copy-btn').addEventListener('click', () => {
    const copyText = document.getElementById("share-url");
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("Link disalin!");
});

document.getElementById('new-chat-btn').onclick = () => {
    currentChatId = Date.now().toString();
    chatBox.innerHTML = "";
    renderHistoryList();
};

document.getElementById('upload-img').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const imgHtml = `<img src="${ev.target.result}" class="chat-img">`;
            renderMessageUI('user', imgHtml, colorUserInput.value, "Kamu");
        };
        reader.readAsDataURL(file);
    }
});

renderHistoryList();