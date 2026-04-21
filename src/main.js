import './style.css'
import { initGlobe } from './globe.js'

/* ═══════════════════════════════════
   SYSTEM PROMPT
═══════════════════════════════════ */
const SYSTEM = `You are Jarvis, an AI business agent for DinkKingdom, an Etsy pickleball print-on-demand shop.

RESPONSE STYLE — CRITICAL:
- Conversational and short. Like texting a smart friend.
- Answer ONLY what was asked. No unsolicited next steps.
- Yes/no questions: answer yes or no first, one sentence max after.
- Only give step-by-step plans when user says "what should I do", "what's next", "give me tasks".
- Call yourself Jarvis. Never say "Let me know if..."
- Under 3 sentences unless they ask for detail.

BUSINESS CONTEXT:
- Shop: DinkKingdom on Etsy
- Products: Pickleball print-on-demand apparel via Printify
- Budget: $100 starting. Goal: $10,000 in 90 days
- Products made: Dink Responsibly tee, Pickleball Is My Therapy tee, Eat Sleep Dink Repeat tee, Just Here For The Dinks tee, Pickleball Mom sweatshirt

MEMORY — append ONLY when business facts change, use EXACT format, this block is hidden from user:
[MEMORY]
niche: <value or UNKNOWN>
shop_name: <value or UNKNOWN>
budget_remaining: <$ or UNKNOWN>
current_phase: <value or UNKNOWN>
last_completed: <value or UNKNOWN>
notes: <comma separated or UNKNOWN>
[/MEMORY]`

/* ═══════════════════════════════════
   STORAGE KEYS — PERMANENT, NEVER CHANGE
═══════════════════════════════════ */
const K = {
  h: 'hq-api-history',
  d: 'hq-display-msgs',
  mem: 'hq-business-memory',
  date: 'hq-start-date',
  key: 'hq-api-key'
}

/* ═══════════════════════════════════
   STATE
═══════════════════════════════════ */
let apiHistory = [], displayLog = [], isLoading = false
let isRecording = false, recognition = null, micPermGranted = false
let mem = { niche: null, shop_name: null, budget_remaining: null, current_phase: null, last_completed: null, notes: [] }

/* ═══════════════════════════════════
   INIT APP
═══════════════════════════════════ */
document.querySelector('#app').innerHTML = `
  <canvas id="particles"></canvas>
  <header>
    <div class="logo">
      <div class="logo-icon">⬡</div>
      JARVIS <span class="logo-sub">/ DINKKINGDOM INTELLIGENCE</span>
    </div>
    <div class="hpills">
      <div class="pill keep"><span class="ldot"></span><span class="v">ONLINE</span></div>
      <div class="pill">DAY <span class="v" id="dpill">1</span>/90</div>
      <div class="pill">TARGET <span class="v">$10K</span></div>
      <button class="hbtn" id="clr">↺ Reset</button>
      <button class="hbtn" id="exp">⬇ Export</button>
    </div>
  </header>

  <div id="api-banner">
    <label>⚡ API KEY</label>
    <input id="api-key-input" type="password" placeholder="sk-ant-api03-..." autocomplete="off"/>
    <button id="save-key-btn">Save</button>
    <span id="key-ok">✓ Saved</span>
  </div>
  <div id="restore-banner">🧠 Memory restored — Jarvis remembers everything</div>

  <div class="main">
    <div class="left">
      <div class="s-label">Quick Ask</div>
      <button class="qbtn" data-msg="What should I do today?">📋 Today's tasks</button>
      <button class="qbtn" data-msg="What's my next step?">➡️ Next step</button>
      <button class="qbtn" data-msg="How should I spend my budget?">💰 Budget advice</button>
      <button class="qbtn" data-msg="How do I get more Etsy sales?">📈 More sales</button>
      <button class="qbtn" data-msg="Give me a new product idea">💡 Product idea</button>
      <button class="qbtn" data-msg="How do I improve my Etsy SEO?">🔍 SEO tips</button>
      <button class="qbtn" data-msg="How do I promote on TikTok?">🎵 TikTok tips</button>
      <button class="qbtn" data-msg="I got a sale! What do I do now?">🎉 Got a sale!</button>
      <div class="sdiv"></div>
      <div class="mem-card">
        <div class="mem-title">Neural Memory</div>
        <div id="memdisplay"><div class="mem-empty">No memory yet</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Budget Remaining</div>
        <div class="stat-val" id="bamt">$100</div>
        <div class="stat-sub">Tracked by Jarvis</div>
      </div>
      <div class="stat-card">
        <div class="day-row">
          <div><div class="stat-label">DAY</div><div class="stat-val" id="dcount" style="font-size:20px;color:var(--ac);">1</div></div>
          <div style="text-align:right"><div class="stat-label">GOAL</div><div class="stat-val" style="font-size:20px;color:var(--muted);">90</div></div>
        </div>
      </div>
    </div>

    <div class="stage">
      <div id="globe-wrap">
        <canvas id="globe-canvas"></canvas>
        <div class="jarvis-status">
          <div class="jsdot" id="jsdot"></div>
          <span id="jslabel">STANDBY</span>
        </div>
        <div class="jarvis-name">J · A · R · V · I · S</div>
      </div>
      <div id="msgs"></div>
      <div id="mstat">
        <div class="mwave"><div class="mb"></div><div class="mb"></div><div class="mb"></div><div class="mb"></div><div class="mb"></div></div>
        Listening — tap mic to stop
      </div>
      <div class="ibar">
        <textarea id="txt" rows="1" placeholder="Ask Jarvis anything..."></textarea>
        <button id="mic">🎤</button>
        <button id="send">➤</button>
      </div>
    </div>
  </div>
`

/* PARTICLES */
initParticles()

/* GLOBE */
initGlobe(document.getElementById('globe-wrap'))

/* DAY COUNT */
const sd = localStorage.getItem(K.date) || new Date().toISOString().split('T')[0]
localStorage.setItem(K.date, sd)
const dn = Math.min(Math.floor((new Date() - new Date(sd)) / 86400000) + 1, 90)
document.getElementById('dcount').textContent = dn
document.getElementById('dpill').textContent = dn

/* API KEY */
if (localStorage.getItem(K.key)) document.getElementById('api-key-input').placeholder = 'Key saved'
document.getElementById('save-key-btn').addEventListener('click', () => {
  const k = document.getElementById('api-key-input').value.trim()
  if (!k) return
  localStorage.setItem(K.key, k)
  document.getElementById('api-key-input').value = ''
  document.getElementById('api-key-input').placeholder = 'Key saved'
  const s = document.getElementById('key-ok')
  s.style.display = 'block'
  setTimeout(() => s.style.display = 'none', 3000)
})

/* CLEAR / EXPORT */
document.getElementById('clr').addEventListener('click', () => {
  if (!confirm('Reset everything? All memory and history will be cleared.')) return
  Object.values(K).forEach(k => localStorage.removeItem(k))
  apiHistory = []; displayLog = []
  mem = { niche: null, shop_name: null, budget_remaining: null, current_phase: null, last_completed: null, notes: [] }
  document.getElementById('msgs').innerHTML = ''
  document.getElementById('bamt').textContent = '$100'
  renderMem(); welcome()
})

document.getElementById('exp').addEventListener('click', () => {
  const txt = 'JARVIS HQ EXPORT — ' + new Date().toLocaleString() + '\n\n' +
    displayLog.map(m => (m.role === 'user' ? 'YOU' : 'JARVIS') + ': ' + m.content).join('\n\n---\n\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }))
  a.download = 'jarvis-hq-' + new Date().toISOString().split('T')[0] + '.txt'
  a.click()
})

/* QUICK BTNS */
document.querySelectorAll('.qbtn').forEach(b => {
  b.addEventListener('click', () => { document.getElementById('txt').value = b.getAttribute('data-msg'); send() })
})

/* INPUT */
document.getElementById('send').addEventListener('click', send)
document.getElementById('txt').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } })
document.getElementById('txt').addEventListener('input', function () { this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 100) + 'px' })

/* ═══════════════════════════════════
   BRAIN STATE
═══════════════════════════════════ */
function setBrain(state) {
  window._brainState = state
  const dot = document.getElementById('jsdot')
  const lbl = document.getElementById('jslabel')
  dot.className = 'jsdot' + (state === 'thinking' ? ' thinking' : state === 'speaking' ? ' speaking' : '')
  lbl.textContent = state === 'thinking' ? 'PROCESSING' : state === 'speaking' ? 'SPEAKING' : 'STANDBY'
}

/* ═══════════════════════════════════
   MIC — continuous=true fixes dropout
═══════════════════════════════════ */
const micBtn = document.getElementById('mic')
const SR = window.SpeechRecognition || window.webkitSpeechRecognition

if (!SR) {
  micBtn.style.opacity = '.3'; micBtn.disabled = true; micBtn.title = 'Use Chrome for voice'
} else {
  micBtn.addEventListener('click', () => {
    if (isRecording) { stopRec(false); return }
    if (micPermGranted) { startRec(); return }
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => { stream.getTracks().forEach(t => t.stop()); micPermGranted = true; startRec() })
      .catch(() => addMsg('agent', 'Mic access denied. Click the lock icon in your address bar and allow microphone.'))
  })
}

function startRec() {
  if (isRecording) return
  recognition = new SR()
  recognition.continuous = true       // KEY FIX — stays active
  recognition.interimResults = true
  recognition.lang = 'en-US'
  recognition.maxAlternatives = 1

  recognition.onstart = () => {
    isRecording = true
    micBtn.classList.remove('waiting'); micBtn.classList.add('recording'); micBtn.textContent = '⏹'
    document.getElementById('mstat').classList.add('on')
    document.getElementById('txt').placeholder = 'Listening...'
  }

  recognition.onresult = e => {
    let final = '', interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript
      else interim += e.results[i][0].transcript
    }
    const inp = document.getElementById('txt')
    inp.value = final || interim
    inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 100) + 'px'
    if (final) stopRec(true)
  }

  recognition.onerror = e => {
    if (e.error === 'no-speech') return  // ignore, keep listening
    stopRec(false)
    if (e.error === 'not-allowed') { micPermGranted = false; addMsg('agent', 'Mic blocked. Allow microphone in browser settings.') }
  }

  recognition.onend = () => {
    if (isRecording) {
      isRecording = false
      micBtn.classList.remove('recording', 'waiting'); micBtn.textContent = '🎤'
      document.getElementById('mstat').classList.remove('on')
      document.getElementById('txt').placeholder = 'Ask Jarvis anything...'
    }
  }

  micBtn.classList.add('waiting'); micBtn.textContent = '...'
  try { recognition.start() } catch (e) { micBtn.classList.remove('waiting'); micBtn.textContent = '🎤' }
}

function stopRec(andSend) {
  isRecording = false
  micBtn.classList.remove('recording', 'waiting'); micBtn.textContent = '🎤'
  document.getElementById('mstat').classList.remove('on')
  document.getElementById('txt').placeholder = 'Ask Jarvis anything...'
  try { if (recognition) recognition.stop() } catch (e) {}
  if (andSend) setTimeout(send, 200)
}

/* ═══════════════════════════════════
   MEMORY
═══════════════════════════════════ */
function loadMem() {
  const s = localStorage.getItem(K.mem)
  if (s) { try { mem = JSON.parse(s) } catch (e) {} }
  renderMem()
}

function saveMem() {
  localStorage.setItem(K.mem, JSON.stringify(mem))
  renderMem()
}

function parseMem(text) {
  // Strip ALL memory block formats
  const clean = text
    .replace(/\[MEMORY\][\s\S]*?\[\/MEMORY\]/gi, '')
    .replace(/<memory_update>[\s\S]*?<\/memory_update>/gi, '')
    .replace(/\[memory\][\s\S]*?\[\/memory\]/gi, '')
    .trim()

  const b = text.match(/\[MEMORY\]([\s\S]*?)\[\/MEMORY\]/i)
  if (b) {
    b[1].trim().split('\n').forEach(line => {
      const idx = line.indexOf(':')
      if (idx < 0) return
      const k = line.slice(0, idx).trim(), v = line.slice(idx + 1).trim()
      if (!v || v === 'UNKNOWN') return
      if (k === 'niche') mem.niche = v
      if (k === 'shop_name') mem.shop_name = v
      if (k === 'budget_remaining') { mem.budget_remaining = v; document.getElementById('bamt').textContent = v }
      if (k === 'current_phase') mem.current_phase = v
      if (k === 'last_completed') mem.last_completed = v
      if (k === 'notes') mem.notes = v.split(',').map(n => n.trim()).filter(Boolean)
    })
    saveMem()
  }
  return clean
}

function renderMem() {
  const el = document.getElementById('memdisplay')
  if (!el) return
  const items = []
  if (mem.niche) items.push(['Niche', mem.niche])
  if (mem.shop_name) items.push(['Shop', mem.shop_name])
  if (mem.budget_remaining) items.push(['Budget', mem.budget_remaining])
  if (mem.current_phase) items.push(['Phase', mem.current_phase])
  if (mem.last_completed) items.push(['Last', mem.last_completed])
  if (mem.notes?.length) mem.notes.forEach((n, i) => { if (n) items.push(['Note' + (i + 1), n]) })
  if (!items.length) { el.innerHTML = '<div class="mem-empty">No memory yet — start chatting!</div>'; return }
  el.innerHTML = items.map(it => `<div class="mem-item"><span class="mk">${esc(it[0])}:</span> <span class="mv">${esc(it[1])}</span></div>`).join('')
}

/* ═══════════════════════════════════
   SESSION
═══════════════════════════════════ */
function saveSession() {
  try {
    localStorage.setItem(K.h, JSON.stringify(apiHistory.slice(-100)))
    localStorage.setItem(K.d, JSON.stringify(displayLog.slice(-100)))
  } catch (e) { console.warn(e) }
}

function loadSession() {
  // Migrate old keys
  const legacy = { h: ['hq-h', 'jv-h'], d: ['hq-d', 'jv-d'], mem: ['hq-m', 'jv-mem', 'hq-mem'], date: ['jv-date'], key: ['jv-key'] }
  Object.keys(legacy).forEach(canon => {
    if (localStorage.getItem(K[canon])) return
    legacy[canon].forEach(old => { const v = localStorage.getItem(old); if (v) localStorage.setItem(K[canon], v) })
  })

  loadMem()
  const h = localStorage.getItem(K.h), d = localStorage.getItem(K.d)
  if (h && d) {
    try {
      apiHistory = JSON.parse(h)
      JSON.parse(d).forEach(m => addMsg(m.role, m.content, true))
      const b = document.getElementById('restore-banner')
      b.classList.add('show')
      setTimeout(() => b.classList.remove('show'), 5000)
      return true
    } catch (e) { console.error(e) }
  }
  return false
}

/* ═══════════════════════════════════
   MESSAGES
═══════════════════════════════════ */
function addMsg(role, content, fromRestore = false) {
  const msgs = document.getElementById('msgs')
  const row = document.createElement('div'); row.className = 'mrow ' + role
  const av = document.createElement('div'); av.className = 'mav ' + role; av.textContent = role === 'agent' ? '🤖' : '👤'
  const bub = document.createElement('div'); bub.className = 'bub ' + role
  bub.innerHTML = role === 'agent' ? md(content) : '<p>' + esc(content) + '</p>'
  if (role === 'agent') { row.appendChild(av); row.appendChild(bub) } else { row.appendChild(bub); row.appendChild(av) }
  msgs.appendChild(row); msgs.scrollTop = msgs.scrollHeight
  if (!fromRestore) displayLog.push({ role, content })
}

function showTyping() {
  const msgs = document.getElementById('msgs')
  const r = document.createElement('div'); r.className = 't-row'; r.id = 'ti'
  r.innerHTML = '<div class="mav agent">🤖</div><div class="t-bub"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>'
  msgs.appendChild(r); msgs.scrollTop = msgs.scrollHeight
}
function hideTyping() { document.getElementById('ti')?.remove() }

function md(t) {
  return t.split('\n').map(l => {
    if (l.startsWith('# ')) return `<h1>${inl(l.slice(2))}</h1>`
    if (l.startsWith('## ')) return `<h2>${inl(l.slice(3))}</h2>`
    if (l.startsWith('### ')) return `<h3>${inl(l.slice(4))}</h3>`
    if (l.startsWith('- ')) return `<p class="li">• ${inl(l.slice(2))}</p>`
    if (/^\d+\.\s/.test(l)) return `<p class="li">${inl(l)}</p>`
    if (l === '') return '<br>'
    return `<p>${inl(l)}</p>`
  }).join('')
}

function inl(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.*?)`/g, '<code>$1</code>')
}
function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;') }

/* WELCOME */
function welcome() {
  addMsg('agent', "Online. I'm **Jarvis**, your DinkKingdom intelligence system. Ask me anything — I'll keep it short. Say **\"what's next\"** when you want your next move.")
}

/* ═══════════════════════════════════
   SEND
═══════════════════════════════════ */
async function send() {
  const inp = document.getElementById('txt')
  const text = inp.value.trim()
  if (!text || isLoading) return
  const key = localStorage.getItem(K.key)
  if (!key) { alert('Enter your Anthropic API key at the top and click Save.'); return }

  addMsg('user', text)
  apiHistory = [...apiHistory, { role: 'user', content: text }]
  inp.value = ''; inp.style.height = 'auto'
  isLoading = true; document.getElementById('send').disabled = true
  showTyping(); setBrain('thinking')

  let memCtx = ''
  if (mem.niche || mem.shop_name || mem.current_phase) {
    memCtx = '\n\nCURRENT CONTEXT:\n'
    if (mem.niche) memCtx += `Niche: ${mem.niche}\n`
    if (mem.shop_name) memCtx += `Shop: ${mem.shop_name}\n`
    if (mem.budget_remaining) memCtx += `Budget: ${mem.budget_remaining}\n`
    if (mem.current_phase) memCtx += `Phase: ${mem.current_phase}\n`
    if (mem.last_completed) memCtx += `Last done: ${mem.last_completed}\n`
    if (mem.notes?.length) memCtx += `Notes: ${mem.notes.join('; ')}\n`
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1800, system: SYSTEM + memCtx, messages: apiHistory })
    })
    const data = await res.json()
    if (data.error) { hideTyping(); setBrain('idle'); addMsg('agent', 'API Error: ' + data.error.message); return }
    const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim()
    const clean = parseMem(raw)
    apiHistory.push({ role: 'assistant', content: data.content })
    hideTyping(); setBrain('idle')
    addMsg('agent', clean || 'Got it.')
    saveSession()
  } catch (err) {
    hideTyping(); setBrain('idle')
    addMsg('agent', 'Connection error. Check your API key.')
    console.error(err)
  } finally {
    isLoading = false
    document.getElementById('send').disabled = false
  }
}

/* ═══════════════════════════════════
   BACKGROUND PARTICLES
═══════════════════════════════════ */
function initParticles() {
  const c = document.getElementById('particles')
  const ctx = c.getContext('2d')
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;'
  let W, H
  const pts = []

  function resize() { W = c.width = window.innerWidth; H = c.height = window.innerHeight }
  resize(); window.addEventListener('resize', resize)

  for (let i = 0; i < 70; i++) {
    pts.push({
      x: Math.random() * 2000, y: Math.random() * 2000,
      vx: (Math.random() - .5) * .12, vy: (Math.random() - .5) * .12,
      r: Math.random() * 1.4 + .3, a: Math.random(),
      pulse: Math.random() * Math.PI * 2, speed: Math.random() * .01 + .004
    })
  }

  function draw() {
    requestAnimationFrame(draw)
    ctx.clearRect(0, 0, W, H)
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.pulse += p.speed
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
      const alpha = (.15 + .25 * Math.sin(p.pulse)) * p.a
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0,150,255,${alpha})`; ctx.fill()
    })
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < 100) {
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y)
          ctx.strokeStyle = `rgba(0,100,255,${(1 - d / 100) * .05})`; ctx.lineWidth = .5; ctx.stroke()
        }
      }
    }
  }
  draw()
}

/* INIT */
setBrain('idle')
const restored = loadSession()
if (!restored) welcome()
else addMsg('agent', 'Systems online. Welcome back.')
