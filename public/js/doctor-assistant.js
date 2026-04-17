// Aqiraa Doctor Selection AI Assistant
// Uses Gemini 1.5 Flash to recommend the right doctor based on parent's concern

const GEMINI_API_KEY = 'AIzaSyAGzS-0n2kfXixrao6ifCFF2LbFdQoJ4bE';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

// Loaded dynamically from Firestore — always up to date
let DOCTORS_PANEL = [];
let SYSTEM_PROMPT = '';

async function loadDoctorsAndBuildPrompt() {
  try {
    const snapshot = await firebase.firestore()
      .collection('doctors')
      .where('active', '==', true)
      .get();

    DOCTORS_PANEL = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));

    const doctorList = DOCTORS_PANEL.map(d =>
      `- ${d.name} (${d.title}, ID: ${d.id}): Expertise in ${(d.expertise || []).join(', ')}`
    ).join('\n');

    const doctorIds = DOCTORS_PANEL.map(d => d.id).join(', ');

    SYSTEM_PROMPT = `You are a friendly and helpful assistant for Aqiraa, a pediatric consultation platform. Your job is to help parents find the right doctor for their child's concern.

You have access to the following doctors panel (always current):
${doctorList}

Your conversation flow:
1. Greet warmly and ask the child's age
2. Ask what concern/symptom they want to consult about
3. Based on their answers, recommend the MOST suitable doctor

Rules:
- Keep responses short, warm, and friendly (1-2 sentences max per message)
- Ask maximum 2 questions before recommending
- When you have enough info to recommend, respond with ONLY this exact JSON (no other text before or after):
{"recommend": "doctor-id", "reason": "one short sentence why"}

Valid doctor IDs: ${doctorIds}

Match based on the expertise listed above for each doctor. Use best judgement for unclear concerns.`;

  } catch (err) {
    console.error('Failed to load doctors from Firestore for assistant:', err);
  }
}

let chatHistory = [];
let assistantOpen = false;
let recommendationDone = false;

// Inject floating bubble + chat window
function injectChatWindow() {
  // Inject animation styles
  if (!document.getElementById('ai-assistant-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-assistant-styles';
    style.textContent = `
      @keyframes ai-pulse {
        0% { box-shadow: 0 0 0 0 rgba(158,15,241,0.5); }
        70% { box-shadow: 0 0 0 14px rgba(158,15,241,0); }
        100% { box-shadow: 0 0 0 0 rgba(158,15,241,0); }
      }
      @keyframes ai-tooltip-in {
        from { opacity: 0; transform: translateX(10px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes ai-chat-in {
        from { opacity: 0; transform: scale(0.92) translateY(12px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      #ai-fab {
        animation: ai-pulse 2.5s ease-out infinite;
        transition: transform 0.2s ease;
      }
      #ai-fab:hover { transform: scale(1.08); }
      #ai-chat-window { animation: ai-chat-in 0.22s ease; }
      #ai-tooltip {
        animation: ai-tooltip-in 0.3s ease 1.2s both;
      }
      .typing-dot{width:7px;height:7px;background:#9e0ff1;border-radius:50%;animation:tdot 1s infinite}
      .typing-dot:nth-child(2){animation-delay:.2s}
      .typing-dot:nth-child(3){animation-delay:.4s}
      @keyframes tdot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
      #ai-chat-window * { box-sizing: border-box; }
      #ai-chat-header { background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%) !important; }
      #ai-chat-header .ai-header-title { color: #ffffff !important; font-weight: 700 !important; font-size: 14px !important; }
      #ai-chat-header .ai-header-subtitle { color: rgba(255,255,255,0.85) !important; font-size: 11px !important; }
      @keyframes ai-glow-pulse {
        0% { box-shadow: 0 0 0 0 rgba(168,85,247,0.6), 0 8px 32px rgba(168,85,247,0.35); }
        50% { box-shadow: 0 0 0 8px rgba(168,85,247,0.0), 0 12px 48px rgba(168,85,247,0.5); }
        100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.6), 0 8px 32px rgba(168,85,247,0.35); }
      }
      @keyframes ai-tag-pop {
        0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
        70% { transform: translateX(-50%) scale(1.12); opacity: 1; }
        100% { transform: translateX(-50%) scale(1); opacity: 1; }
      }
      @keyframes ai-shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      .ai-recommended-card {
        border: 2.5px solid transparent !important;
        background-clip: padding-box;
        outline: 3px solid #a855f7;
        outline-offset: 2px;
        animation: ai-glow-pulse 2s ease-in-out infinite !important;
        transform: translateY(-6px) scale(1.02) !important;
        transition: all 0.4s ease !important;
        position: relative;
        z-index: 2;
      }
      .ai-recommended-tag {
        position: absolute; top: -16px; left: 50%; transform: translateX(-50%);
        background: linear-gradient(90deg, #7c3aed, #a855f7, #ec4899, #a855f7, #7c3aed);
        background-size: 200% auto;
        animation: ai-tag-pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards, ai-shimmer 2.5s linear 0.4s infinite;
        color: #ffffff; padding: 5px 16px; border-radius: 20px;
        font-size: 12px; font-weight: 800; white-space: nowrap;
        box-shadow: 0 4px 16px rgba(168,85,247,0.5);
        letter-spacing: 0.5px; z-index: 10;
      }
    `;
    document.head.appendChild(style);
  }

  const html = `
    <!-- Floating bubble -->
    <div style="position: fixed; bottom: 28px; right: 28px; z-index: 9998; display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">

      <!-- Tooltip label -->
      <div id="ai-tooltip" style="
        background: #1a1a2e; color: white; font-size: 12px; font-weight: 600;
        padding: 7px 14px; border-radius: 20px; white-space: nowrap;
        pointer-events: none; letter-spacing: 0.3px;
      ">Find the right doctor ✨</div>

      <!-- FAB button -->
      <div id="ai-fab" onclick="toggleAssistant()" style="
        width: 58px; height: 58px;
        background: linear-gradient(135deg, #a855f7, #ec4899);
        border-radius: 50%; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 6px 20px rgba(168,85,247,0.4);
      ">
        <i id="ai-fab-icon" class="fa fa-magic" style="color: white; font-size: 20px;"></i>
      </div>
    </div>

    <!-- Chat window -->
    <div id="ai-chat-window" style="
      display: none; position: fixed; bottom: 100px; right: 28px;
      width: 360px; background: white;
      border-radius: 20px; box-shadow: 0 12px 48px rgba(0,0,0,0.22);
      border: 1px solid #d8b4fe;
      z-index: 9999; overflow: hidden; flex-direction: column;
    ">
      <!-- Header -->
      <div id="ai-chat-header" style="background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid rgba(255,255,255,0.15);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <i class="fa fa-magic" style="color: #ffffff; font-size: 14px;"></i>
          </div>
          <div>
            <div class="ai-header-title">Aqiraa Assistant</div>
            <div class="ai-header-subtitle">AI-powered doctor finder</div>
          </div>
        </div>
        <button onclick="toggleAssistant()" style="background: none; border: none; font-size: 18px; cursor: pointer; padding: 4px 8px; line-height:1; color: #ffffff; opacity: 0.8;">
          <i class="fa fa-times"></i>
        </button>
      </div>

      <!-- Messages -->
      <div id="ai-chat-messages" style="overflow-y: auto; padding: 16px; height: 300px; background: #fafafa;"></div>

      <!-- Input -->
      <div style="padding: 12px 16px; background: white; border-top: 1px solid #f0f0f0; display: flex; gap: 8px; align-items: flex-end;">
        <textarea id="ai-chat-input" placeholder="Type your message..." rows="1" style="
          flex: 1; border: 1.5px solid #e8e8e8; border-radius: 14px;
          padding: 9px 14px; font-size: 13px; outline: none; resize: none;
          line-height: 1.4; max-height: 120px; overflow-y: auto; font-family: inherit;
        " onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); sendAssistantMessage(); }"
           oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px';"
           onfocus="this.style.borderColor='#9e0ff1'"
           onblur="this.style.borderColor='#e8e8e8'"></textarea>
        <button onclick="sendAssistantMessage()" style="
          width: 36px; height: 36px; background: linear-gradient(135deg, #9e0ff1, #f41192);
          border: none; border-radius: 50%; cursor: pointer; display: flex;
          align-items: center; justify-content: center; flex-shrink: 0; margin-bottom: 1px;
        ">
          <i class="fa fa-paper-plane" style="color: white; font-size: 13px;"></i>
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  // Hide tooltip after 5s
  setTimeout(() => {
    const t = document.getElementById('ai-tooltip');
    if (t) t.style.display = 'none';
  }, 5000);
}

window.toggleAssistant = function () {
  const win = document.getElementById('ai-chat-window');
  const icon = document.getElementById('ai-fab-icon');
  const tooltip = document.getElementById('ai-tooltip');
  if (!win) return;
  assistantOpen = !assistantOpen;
  win.style.display = assistantOpen ? 'flex' : 'none';
  if (icon) {
    icon.className = assistantOpen ? 'fa fa-times' : 'fa fa-magic';
    icon.style.fontSize = assistantOpen ? '20px' : '22px';
  }
  if (tooltip) tooltip.style.display = 'none';
  // Only start conversation on very first open
  if (assistantOpen && chatHistory.length === 0) {
    startConversation();
  }
};

async function startConversation() {
  chatHistory = [];
  const container = document.getElementById('ai-chat-messages');
  if (container) container.innerHTML = '';

  // If prefetch hasn't completed yet, wait — otherwise instant
  if (DOCTORS_PANEL.length === 0) {
    addBotMessage("One moment... ⏳");
    await loadDoctorsAndBuildPrompt();
    if (container) container.innerHTML = '';
  }

  const input = document.getElementById('ai-chat-input');
  if (input) { input.disabled = false; input.placeholder = 'Type your message...'; }

  addBotMessage("Hi there! 👋 I'll help you find the right doctor for your child.");
  setTimeout(() => addBotMessage("How old is your child?"), 600);
}

function addBotMessage(text) {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.style.cssText = 'display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-start;';
  div.innerHTML = `
    <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #9e0ff1, #f41192); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
      <i class="fa fa-magic" style="color: white; font-size: 10px;"></i>
    </div>
    <div style="background: white; border: 1px solid #f0e6ff; border-radius: 14px 14px 14px 2px; padding: 10px 14px; font-size: 13px; color: #333; max-width: 260px; line-height: 1.5; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
      ${text}
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addUserMessage(text) {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.style.cssText = 'display: flex; justify-content: flex-end; margin-bottom: 12px;';
  div.innerHTML = `
    <div style="background: linear-gradient(135deg, #9e0ff1, #f41192); color: white; border-radius: 14px 14px 2px 14px; padding: 10px 14px; font-size: 13px; max-width: 260px; line-height: 1.5;">
      ${text}
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addTypingIndicator() {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.id = 'typing-indicator';
  div.style.cssText = 'display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-start;';
  div.innerHTML = `
    <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #9e0ff1, #f41192); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
      <i class="fa fa-magic" style="color: white; font-size: 10px;"></i>
    </div>
    <div style="background: white; border: 1px solid #f0e6ff; border-radius: 14px; padding: 12px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
      <span style="display: inline-flex; gap: 4px; align-items: center;">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </span>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  if (!document.getElementById('typing-style')) {
    const style = document.createElement('style');
    style.id = 'typing-style';
    style.textContent = '.typing-dot{width:7px;height:7px;background:#9e0ff1;border-radius:50%;animation:tdot 1s infinite}.typing-dot:nth-child(2){animation-delay:.2s}.typing-dot:nth-child(3){animation-delay:.4s}@keyframes tdot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}';
    document.head.appendChild(style);
  }
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

window.sendAssistantMessage = async function () {
  const input = document.getElementById('ai-chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';
  input.disabled = true;
  addUserMessage(text);
  chatHistory.push({ role: 'user', parts: [{ text }] });
  addTypingIndicator();

  try {
    const response = await callGemini();
    removeTypingIndicator();

    const jsonMatch = response.match(/\{[\s\S]*"recommend"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const rec = JSON.parse(jsonMatch[0]);
        handleRecommendation(rec.recommend, rec.reason);
        input.disabled = true; // keep disabled after recommendation
        return;
      } catch (e) { /* fall through */ }
    }

    chatHistory.push({ role: 'model', parts: [{ text: response }] });
    addBotMessage(response);
  } catch (err) {
    removeTypingIndicator();
    addBotMessage("Sorry, I'm having trouble connecting. Please try again in a moment.");
    console.error('Gemini error:', err);
  } finally {
    if (!recommendationDone) {
      input.disabled = false;
      input.focus();
    }
  }
};

async function callGemini() {
  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: chatHistory
  };

  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

function handleRecommendation(doctorId, reason) {
  const doctor = DOCTORS_PANEL.find(d => d.id === doctorId);
  const name = doctor ? doctor.name : 'a specialist';

  recommendationDone = true;
  addBotMessage(`Great! Based on your child's needs, I recommend <strong>${name}</strong>. ${reason} 🎯<br><br>Scrolling to their card now...`);

  // Show "Start New Search" chip after a moment
  setTimeout(() => addRestartChip(), 800);

  setTimeout(() => {
    toggleAssistant();
    highlightRecommendedDoctor(doctorId);
  }, 2000);
}

function addRestartChip() {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;
  const div = document.createElement('div');
  div.id = 'restart-chip';
  div.style.cssText = 'display: flex; justify-content: center; margin: 8px 0 4px;';
  div.innerHTML = `
    <button onclick="restartAssistant()" style="
      background: white; border: 1.5px solid #a855f7; color: #7c3aed;
      border-radius: 20px; padding: 7px 18px; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    " onmouseover="this.style.background='#f3e8ff'" onmouseout="this.style.background='white'">
      👋 Search for another doctor
    </button>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

window.restartAssistant = async function () {
  recommendationDone = false;
  // Re-open chat if closed
  if (!assistantOpen) toggleAssistant();
  await startConversation();
};

function highlightRecommendedDoctor(doctorId) {
  // Remove previous highlights
  document.querySelectorAll('.ai-recommended-tag').forEach(el => el.remove());
  document.querySelectorAll('.doctor-card').forEach(card => {
    card.classList.remove('ai-recommended-card');
    card.style.border = '';
    card.style.boxShadow = '';
    card.style.transform = '';
    card.style.outline = '';
  });

  // Style already injected via ai-assistant-styles

  const container = document.getElementById('doctors-container');
  const allCards = document.querySelectorAll('.doctor-card');
  let found = false;

  allCards.forEach(card => {
    const bookBtn = card.querySelector(`[onclick*="${doctorId}"]`);
    if (bookBtn) {
      found = true;
      card.classList.add('ai-recommended-card');
      card.style.position = 'relative';

      const tag = document.createElement('div');
      tag.className = 'ai-recommended-tag';
      tag.innerHTML = '<i class="fa fa-magic"></i>&nbsp; AI Recommended';
      card.insertBefore(tag, card.firstChild);

      // Move recommended card to first position in the grid
      if (container && card !== container.firstElementChild) {
        container.insertBefore(card, container.firstElementChild);
      }

      setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  });

  if (!found) {
    document.getElementById('doctor-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  injectChatWindow();
  // Prefetch doctors in background immediately — so chat opens instantly
  loadDoctorsAndBuildPrompt();

  // Auto-open when doctor-booking section comes into view
  const doctorSection = document.getElementById('doctor-booking');
  if (doctorSection && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !assistantOpen) {
          setTimeout(() => {
            if (!assistantOpen) toggleAssistant();
          }, 600);
          observer.disconnect(); // only trigger once per page load
        }
      });
    }, { threshold: 0.2 }); // trigger when 20% of section is visible
    observer.observe(doctorSection);
  }
});
