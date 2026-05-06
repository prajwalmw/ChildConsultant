// Aqiraa Doctor Selection AI Assistant — Gemini only (free tier: Hosting + Firestore, no Blaze).
//
// Speed: streaming (SSE) + config cache. maxOutputTokens must fit full {"recommend","reason"} JSON — too low truncates and breaks doctor highlight.
// Add your key ONLY in Firebase Console → Firestore → siteConfig/assistant :
//   geminiApiKey (string) — from https://aistudio.google.com/apikey (free quota)
//   model (optional string), default gemini-flash-latest (try gemini-2.0-flash if available for latency)
//
// Do NOT put the Gemini key in GitHub or in tracked source files. Restrict the key in
// Google AI Studio / Cloud Console to your site referrer (e.g. child-consultant.web.app).

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models';

/** Room for short chat + full recommendation JSON (truncation used to break parse + scroll/highlight). */
const GEMINI_GENERATION_CONFIG = {
  maxOutputTokens: 2048,
  temperature: 0.45,
  topP: 0.95,
};

const GEMINI_RETRY_CONFIG = {
  maxOutputTokens: 8192,
  temperature: 0.35,
  topP: 0.95,
};

/** Skip Firestore config reads on every message (key/model rarely change). */
let assistantConfigFetchedAt = 0;
const ASSISTANT_CONFIG_TTL_MS = 15 * 60 * 1000;

/** Sparkle icon (same paths as user SVG); both shapes filled plain white for gradient FAB / headers. */
function svgAiAssistantIcon(sizePx) {
  var s = sizePx || 24;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    s +
    '" height="' +
    s +
    '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
    '<path fill="#ffffff" d="M23.426,31.911l-1.719,3.936c-0.661,1.513-2.754,1.513-3.415,0l-1.719-3.936c-1.529-3.503-4.282-6.291-7.716-7.815l-4.73-2.1c-1.504-0.668-1.504-2.855,0-3.523l4.583-2.034c3.522-1.563,6.324-4.455,7.827-8.077l1.741-4.195c0.646-1.557,2.797-1.557,3.443,0l1.741,4.195c1.503,3.622,4.305,6.514,7.827,8.077l4.583,2.034c1.504,0.668,1.504,2.855,0,3.523l-4.73,2.1C27.708,25.62,24.955,28.409,23.426,31.911z"/>' +
    '<path fill="#ffffff" d="M38.423,43.248l-0.493,1.131c-0.361,0.828-1.507,0.828-1.868,0l-0.493-1.131c-0.879-2.016-2.464-3.621-4.44-4.5l-1.52-0.675c-0.822-0.365-0.822-1.56,0-1.925l1.435-0.638c2.027-0.901,3.64-2.565,4.504-4.65l0.507-1.222c0.353-0.852,1.531-0.852,1.884,0l0.507,1.222c0.864,2.085,2.477,3.749,4.504,4.65l1.435,0.638c0.822,0.365,0.822,1.56,0,1.925l-1.52,0.675C40.887,39.627,39.303,41.232,38.423,43.248z"/>' +
    '</svg>'
  );
}

let DOCTORS_PANEL = [];
let SYSTEM_PROMPT = '';
let assistantGeminiModel = 'gemini-flash-latest';
let assistantGeminiApiKey = '';

async function loadAssistantConfig(forceRefresh) {
  const now = Date.now();
  if (
    !forceRefresh &&
    assistantGeminiApiKey &&
    now - assistantConfigFetchedAt < ASSISTANT_CONFIG_TTL_MS
  ) {
    return;
  }
  assistantGeminiApiKey = '';
  try {
    if (typeof firebase === 'undefined' || !firebase.firestore) return;
    const snap = await firebase.firestore().collection('siteConfig').doc('assistant').get();
    if (!snap.exists) return;
    const d = snap.data() || {};
    const key = (d.geminiApiKey || d.apiKey || '').trim();
    if (key) assistantGeminiApiKey = key;
    if (d.model && String(d.model).trim()) assistantGeminiModel = String(d.model).trim();
    assistantConfigFetchedAt = Date.now();
  } catch (e) {
    console.error('Aqiraa Assistant: could not load siteConfig/assistant', e);
  }
}

async function loadDoctorsAndBuildPrompt() {
  try {
    const snapshot = await firebase.firestore().collection('doctors').get();

    DOCTORS_PANEL = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id };
      })
      .filter(function (d) {
        return d.active !== false;
      })
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
/** Auto-open when doctors section scrolls into view — at most once per page load (observer disconnects). */
let aiDoctorSectionAutoOpenHandled = false;

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
        background: #ffffff !important;
        color: #312e81 !important;
        -webkit-text-fill-color: #312e81 !important;
        border: 1px solid rgba(124, 58, 237, 0.4) !important;
        box-shadow: 0 6px 22px rgba(15, 23, 42, 0.14) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
      }
      .typing-dot{width:7px;height:7px;background:#9e0ff1;border-radius:50%;animation:tdot 1s infinite}
      .typing-dot:nth-child(2){animation-delay:.2s}
      .typing-dot:nth-child(3){animation-delay:.4s}
      @keyframes tdot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
      #ai-chat-window * { box-sizing: border-box; }
      #ai-chat-header { background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%) !important; }
      #ai-chat-header .ai-header-title { color: #ffffff !important; font-weight: 700 !important; font-size: 14px !important; }
      #ai-chat-header .ai-header-subtitle { color: rgba(255,255,255,0.85) !important; font-size: 11px !important; }
      /* Beat global child-friendly.css "div { color: dark !important }" on user bubbles */
      #ai-chat-messages .ai-chat-user-bubble,
      #ai-chat-messages .ai-chat-user-bubble * {
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
      }
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
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        padding: 5px 16px; border-radius: 20px;
        font-size: 12px; font-weight: 800; white-space: nowrap;
        box-shadow: 0 4px 16px rgba(168,85,247,0.5);
        letter-spacing: 0.5px; z-index: 10;
      }
      .ai-recommended-tag * {
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
      }
    `;
    document.head.appendChild(style);
  }

  const html = `
    <!-- Floating bubble -->
    <div style="position: fixed; bottom: 28px; right: 28px; z-index: 9998; display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">

      <!-- Tooltip label -->
      <div id="ai-tooltip" style="
        background: #ffffff; color: #312e81; font-size: 12px; font-weight: 600;
        padding: 7px 14px; border-radius: 20px; white-space: nowrap;
        pointer-events: none; letter-spacing: 0.3px;
        border: 1px solid rgba(124, 58, 237, 0.35);
        box-shadow: 0 6px 22px rgba(15, 23, 42, 0.12);
      ">Find the right doctor ✨</div>

      <!-- FAB button -->
      <div id="ai-fab" onclick="toggleAssistant()" style="
        width: 58px; height: 58px;
        background: linear-gradient(135deg, #a855f7, #ec4899);
        border-radius: 50%; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 6px 20px rgba(168,85,247,0.4);
      ">
        <span id="ai-fab-icon-open" style="display:flex;align-items:center;justify-content:center;line-height:0;">${svgAiAssistantIcon(26)}</span>
        <i id="ai-fab-icon-close" class="fa fa-times" style="display:none;color:#fff;font-size:22px;line-height:1;"></i>
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
            ${svgAiAssistantIcon(20)}
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
  const iconOpen = document.getElementById('ai-fab-icon-open');
  const iconClose = document.getElementById('ai-fab-icon-close');
  const tooltip = document.getElementById('ai-tooltip');
  if (!win) return;
  assistantOpen = !assistantOpen;
  win.style.display = assistantOpen ? 'flex' : 'none';
  if (iconOpen && iconClose) {
    if (assistantOpen) {
      iconOpen.style.display = 'none';
      iconClose.style.display = 'block';
    } else {
      iconOpen.style.display = 'flex';
      iconClose.style.display = 'none';
    }
  }
  if (tooltip) tooltip.style.display = 'none';
  // Only start conversation on very first open
  if (assistantOpen && chatHistory.length === 0) {
    startConversation();
  }
};

async function startConversation() {
  chatHistory = [];
  recommendationDone = false;
  const container = document.getElementById('ai-chat-messages');
  if (container) container.innerHTML = '';

  if (DOCTORS_PANEL.length === 0) {
    addBotMessage('One moment... ⏳');
    await Promise.all([loadAssistantConfig(), loadDoctorsAndBuildPrompt()]);
    if (container) container.innerHTML = '';
  } else {
    await loadAssistantConfig();
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
      ${svgAiAssistantIcon(15)}
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
    <div class="ai-chat-user-bubble" style="background: linear-gradient(135deg, #9e0ff1, #f41192); color: #ffffff; border-radius: 14px 14px 2px 14px; padding: 10px 14px; font-size: 13px; max-width: 260px; line-height: 1.5;">
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
      ${svgAiAssistantIcon(15)}
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

function buildGeminiRequestBody(overrides) {
  var gen = GEMINI_GENERATION_CONFIG;
  if (overrides && overrides.generationConfig) {
    gen = Object.assign({}, GEMINI_GENERATION_CONFIG, overrides.generationConfig);
  }
  return {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT || 'You are a helpful assistant.' }],
    },
    contents: chatHistory,
    generationConfig: gen,
  };
}

/** Parse recommendation JSON from model text (single object); avoids fragile regex on truncated output. */
function parseRecommendationFromModelText(text) {
  if (!text || text.indexOf('"recommend"') === -1) return null;
  var start = text.indexOf('{');
  var end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    var o = JSON.parse(text.slice(start, end + 1));
    if (o && o.recommend) return o;
  } catch (e) {
    /* incomplete or extra prose */
  }
  return null;
}

function looksLikeRecommendationAttempt(text) {
  return !!(text && /"recommend"\s*:/.test(text));
}

function extractTextFromGeminiChunk(data) {
  if (!data || !data.candidates || !data.candidates[0]) return '';
  const c = data.candidates[0];
  if (c.content && c.content.parts) {
    var t = '';
    for (var i = 0; i < c.content.parts.length; i++) {
      if (c.content.parts[i].text) t += c.content.parts[i].text;
    }
    return t;
  }
  return '';
}

/** Stream tokens via SSE — feels much faster than waiting for full generateContent. */
async function callGeminiStreaming(requestBody, onDelta) {
  if (!assistantGeminiApiKey) {
    throw new Error('MISSING_GEMINI_KEY');
  }
  var url =
    GEMINI_API_BASE +
    '/' +
    encodeURIComponent(assistantGeminiModel) +
    ':streamGenerateContent?alt=sse';
  var res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': assistantGeminiApiKey,
    },
    body: JSON.stringify(requestBody),
  });
  if (!res.ok) {
    var errText = await res.text();
    throw new Error('API ' + res.status + ': ' + errText.slice(0, 400));
  }
  if (!res.body || !res.body.getReader) {
    throw new Error('Streaming not supported in this browser');
  }
  var reader = res.body.getReader();
  var decoder = new TextDecoder();
  var buffer = '';
  var fullText = '';
  while (true) {
    var read = await reader.read();
    if (read.done) break;
    buffer += decoder.decode(read.value, { stream: true });
    var lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li].trim();
      if (line.indexOf('data:') !== 0) continue;
      var jsonStr = line.slice(5).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;
      try {
        var data = JSON.parse(jsonStr);
        var piece = extractTextFromGeminiChunk(data);
        if (piece) {
          fullText += piece;
          if (typeof onDelta === 'function') onDelta(piece, fullText);
        }
      } catch (parseErr) {
        console.warn('Aqiraa Assistant: SSE chunk parse', parseErr);
      }
    }
  }
  if (!fullText.trim()) {
    throw new Error('No text in model response (safety filter or empty stream)');
  }
  return fullText;
}

function beginStreamingBotMessage() {
  var container = document.getElementById('ai-chat-messages');
  if (!container) return null;
  var div = document.createElement('div');
  div.id = 'ai-streaming-row';
  div.style.cssText =
    'display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-start;';
  div.innerHTML =
    '<div style="width: 28px; height: 28px; background: linear-gradient(135deg, #9e0ff1, #f41192); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">' +
    svgAiAssistantIcon(15) +
    '</div>' +
    '<div data-ai-stream-bubble="1" style="background: white; border: 1px solid #f0e6ff; border-radius: 14px 14px 14px 2px; padding: 10px 14px; font-size: 13px; color: #333; max-width: 260px; line-height: 1.5; box-shadow: 0 1px 4px rgba(0,0,0,0.06); white-space: pre-wrap; word-break: break-word;"></div>';
  container.appendChild(div);
  var bubble = div.querySelector('[data-ai-stream-bubble]');
  container.scrollTop = container.scrollHeight;
  return {
    append: function (delta) {
      if (bubble) {
        bubble.textContent += delta;
        container.scrollTop = container.scrollHeight;
      }
    },
    remove: function () {
      div.remove();
    },
  };
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
    await loadAssistantConfig();
    if (!SYSTEM_PROMPT || DOCTORS_PANEL.length === 0) {
      await loadDoctorsAndBuildPrompt();
    }
    if (!SYSTEM_PROMPT || DOCTORS_PANEL.length === 0) {
      removeTypingIndicator();
      addBotMessage('Could not load doctors for the assistant. Please refresh the page.');
      return;
    }
    if (!assistantGeminiApiKey) {
      removeTypingIndicator();
      addBotMessage(
        'AI assistant is not configured yet. In Firebase Console → Firestore, create document siteConfig/assistant with field geminiApiKey (your free Google AI Studio key). Never paste that key into GitHub.'
      );
      return;
    }

    var requestBody = buildGeminiRequestBody();
    var streamUi = null;
    var gotDelta = false;
    var response = '';

    try {
      response = await callGeminiStreaming(requestBody, function (delta) {
        if (!gotDelta) {
          gotDelta = true;
          removeTypingIndicator();
          streamUi = beginStreamingBotMessage();
        }
        if (streamUi) streamUi.append(delta);
      });
    } catch (streamErr) {
      console.warn('Aqiraa Assistant: streaming failed, retrying without stream', streamErr);
      if (streamUi) {
        streamUi.remove();
        streamUi = null;
      }
      if (gotDelta) {
        removeTypingIndicator();
        addBotMessage("Sorry, the reply was cut off. Please try again.");
        return;
      }
      removeTypingIndicator();
      response = await callGeminiGenerate(requestBody);
      if (response) addBotMessage(response);
    }

    var rec = parseRecommendationFromModelText(response);
    if (!rec && looksLikeRecommendationAttempt(response)) {
      if (streamUi) {
        streamUi.remove();
        streamUi = null;
        gotDelta = false;
      }
      try {
        response = await callGeminiGenerate(
          buildGeminiRequestBody({ generationConfig: GEMINI_RETRY_CONFIG })
        );
        rec = parseRecommendationFromModelText(response);
      } catch (retryErr) {
        console.warn('Aqiraa Assistant: recommendation retry failed', retryErr);
      }
    }

    if (rec && rec.recommend) {
      if (streamUi) streamUi.remove();
      handleRecommendation(rec.recommend, rec.reason || '');
      input.disabled = true;
      return;
    }

    chatHistory.push({ role: 'model', parts: [{ text: response }] });
  } catch (err) {
    removeTypingIndicator();
    const msg = err && err.message ? String(err.message) : '';
    if (msg === 'MISSING_GEMINI_KEY' || msg.includes('MISSING_GEMINI_KEY')) {
      addBotMessage(
        'Add geminiApiKey to Firestore siteConfig/assistant (Firebase Console only — not in GitHub).'
      );
    } else if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('CORS')
    ) {
      addBotMessage(
        'Browser could not reach Gemini (network or CORS). Check API key “HTTP referrer” restrictions include https://child-consultant.web.app'
      );
    } else if (msg.includes('403') || msg.includes('401') || msg.includes('API key') || msg.includes('PERMISSION_DENIED')) {
      addBotMessage(
        'Gemini rejected the key (invalid, revoked, or restricted). Create a fresh key in Google AI Studio, update Firestore siteConfig/assistant.geminiApiKey only, and restrict the key to your website — never commit keys to a public repo.'
      );
    } else {
      addBotMessage("Sorry, I'm having trouble connecting. Please try again in a moment.");
    }
    console.error('Gemini error:', err);
  } finally {
    if (!recommendationDone) {
      input.disabled = false;
      input.focus();
    }
  }
};

async function callGeminiGenerate(requestBody) {
  if (!assistantGeminiApiKey) {
    throw new Error('MISSING_GEMINI_KEY');
  }

  const url = `${GEMINI_API_BASE}/${encodeURIComponent(
    assistantGeminiModel
  )}:generateContent`;

  const body = requestBody || buildGeminiRequestBody();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': assistantGeminiApiKey,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${raw.slice(0, 400)}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error('Invalid JSON from Gemini');
  }

  const text =
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0]
      ? data.candidates[0].content.parts[0].text
      : '';

  if (!text && data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  if (!text) {
    throw new Error('No text in model response (safety filter or empty candidates)');
  }
  return text;
}

function handleRecommendation(doctorId, reason) {
  const idStr = String(doctorId);
  const doctor = DOCTORS_PANEL.find(function (d) {
    return String(d.id) === idStr;
  });
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
  document.querySelectorAll('.pro-doc-card').forEach(card => {
    card.classList.remove('ai-recommended-card');
    card.style.border = '';
    card.style.boxShadow = '';
    card.style.transform = '';
    card.style.outline = '';
  });

  // Style already injected via ai-assistant-styles

  const container = document.getElementById('doctors-container');
  const allCards = document.querySelectorAll('.pro-doc-card');
  const idStr = String(doctorId);
  let found = false;

  allCards.forEach(card => {
    const bookBtn = card.querySelector('button[data-doctor-action="book"]');
    if (bookBtn && bookBtn.getAttribute('data-doctor-id') === idStr) {
      found = true;
      card.classList.add('ai-recommended-card');
      card.style.position = 'relative';

      const tag = document.createElement('div');
      tag.className = 'ai-recommended-tag';
      tag.innerHTML =
        '<span style="display:inline-flex;vertical-align:middle;margin-right:5px;line-height:0;">' +
        svgAiAssistantIcon(13) +
        '</span> AI Recommended';
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

/** Open the assistant once when the doctors panel scrolls into view (observer disconnects after). */
function setupDoctorSectionAutoOpenAssistant() {
  const target = document.getElementById('doctor-booking');
  if (!target || typeof IntersectionObserver === 'undefined') return;

  const observer = new IntersectionObserver(
    function (entries) {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry.isIntersecting) continue;
        if (entry.intersectionRatio < 0.12) continue;
        if (aiDoctorSectionAutoOpenHandled) return;

        aiDoctorSectionAutoOpenHandled = true;
        observer.disconnect();

        if (!assistantOpen && typeof window.toggleAssistant === 'function') {
          window.toggleAssistant();
        }
        return;
      }
    },
    {
      root: null,
      threshold: [0, 0.08, 0.12, 0.18, 0.25, 0.35],
      rootMargin: '0px 0px -8% 0px',
    }
  );

  observer.observe(target);
}

document.addEventListener('DOMContentLoaded', function () {
  injectChatWindow();
  requestAnimationFrame(function () {
    setupDoctorSectionAutoOpenAssistant();
  });
});
