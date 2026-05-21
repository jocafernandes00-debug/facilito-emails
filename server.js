if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
}

const express    = require('express');
const multer     = require('multer');
const XLSX       = require('xlsx');
const { Resend } = require('resend');
const crypto     = require('crypto');
const fs         = require('fs');
const path       = require('path');

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Lista de descadastros (em memória + arquivo) ───────────────────────────
const UNSUB_FILE = path.join(__dirname, 'unsubscribed.json');

function loadUnsubs() {
  try { return new Set(JSON.parse(fs.readFileSync(UNSUB_FILE, 'utf-8'))); }
  catch { return new Set(); }
}

function saveUnsubs(set) {
  try { fs.writeFileSync(UNSUB_FILE, JSON.stringify([...set])); } catch {}
}

const unsubscribed = loadUnsubs();

// ── Token de descadastro (HMAC para evitar descadastros arbitrários) ───────
const UNSUB_SECRET = process.env.UNSUB_SECRET || 'facilito-unsub-secret';

function unsubToken(email) {
  return crypto.createHmac('sha256', UNSUB_SECRET).update(email.toLowerCase()).digest('hex').slice(0, 16);
}

// ── Templates ──────────────────────────────────────────────────────────────
const TEMPLATES = {
  precadastro: {
    subject: 'Você está na lista do Facilito!',
    file:    'email-precadastro.html',
    preview: 'email-precadastro-preview.html',
    label:   'Pré-cadastro',
    desc:    'Enviado para quem se inscreveu na lista de espera.',
    color:   '#3662FF',
  },
  beta: {
    subject: 'Você foi selecionado para testar o Facilito',
    file:    'email-beta.html',
    preview: 'email-beta-preview.html',
    label:   'Acesso Beta',
    desc:    'Convite para testar o app antes do lançamento.',
    color:   '#F9CE62',
  },
  lancamento: {
    subject: 'O Facilito chegou! Acesse agora',
    file:    'email-lancamento.html',
    preview: 'email-lancamento-preview.html',
    label:   'Lançamento',
    desc:    'Anúncio oficial — o app está no ar.',
    color:   '#22c55e',
  },
};

const BASE_URL = process.env.BASE_URL || 'https://facilito-emails.onrender.com';

function loadHtml(template, recipientEmail) {
  const token = recipientEmail ? unsubToken(recipientEmail) : '';
  const unsubUrl = recipientEmail
    ? `${BASE_URL}/descadastrar?email=${encodeURIComponent(recipientEmail)}&token=${token}`
    : `${BASE_URL}/descadastrar`;

  return fs.readFileSync(path.join(__dirname, TEMPLATES[template].file), 'utf-8')
    .replaceAll('{{IMAGE_BASE_URL}}', process.env.IMAGE_BASE_URL || '')
    .replaceAll('{{UNSUBSCRIBE_URL}}', unsubUrl);
}

function createResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function extractEmails(text) {
  const re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  return [...new Set((text.match(re) || []).map(e => e.toLowerCase()))];
}

// ── Rotas ──────────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'app.html')));

app.use('/preview', express.static(__dirname));

// Retorna lista de templates para o frontend
app.get('/templates', (req, res) => {
  const list = Object.entries(TEMPLATES).map(([id, t]) => ({
    id, label: t.label, desc: t.desc, color: t.color, subject: t.subject, preview: t.preview,
  }));
  res.json(list);
});

// ── Descadastro ────────────────────────────────────────────────────────────

app.get('/descadastrar', (req, res) => {
  const { email, token } = req.query;

  const alreadyUnsub = email && unsubscribed.has(email.toLowerCase());

  // Token válido → descadastro automático via link
  if (email && token && token === unsubToken(email) && !alreadyUnsub) {
    unsubscribed.add(email.toLowerCase());
    saveUnsubs(unsubscribed);
  }

  const confirmed = email && token && token === unsubToken(email);

  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Descadastro — Facilito</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #060D28; color: #E8EDF8; font-family: Arial, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #0C1535; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 48px 40px; max-width: 480px; width: 100%; text-align: center; }
    .logo { font-size: 24px; font-weight: 900; color: #fff; margin-bottom: 32px; }
    .logo span { color: #F9CE62; }
    h1 { font-size: 22px; font-weight: 900; margin-bottom: 12px; }
    p { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; margin-bottom: 24px; }
    form { display: flex; flex-direction: column; gap: 12px; }
    input[type=email] { background: #060D28; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; color: #E8EDF8; font-size: 14px; padding: 14px 16px; outline: none; transition: border-color 0.15s; }
    input[type=email]:focus { border-color: rgba(54,98,255,0.6); }
    button { background: #3662FF; border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 900; padding: 14px; cursor: pointer; transition: opacity 0.15s; }
    button:hover { opacity: 0.85; }
    .success { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2); border-radius: 12px; color: #22c55e; font-size: 14px; font-weight: 700; padding: 16px; }
    .already { background: rgba(249,206,98,0.1); border: 1px solid rgba(249,206,98,0.2); border-radius: 12px; color: #F9CE62; font-size: 14px; font-weight: 700; padding: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">facilito<span>.</span></div>
    ${confirmed && alreadyUnsub ? `
      <h1>Já descadastrado</h1>
      <p>Este email já estava removido da nossa lista.</p>
      <div class="already">${email}</div>
    ` : confirmed ? `
      <h1>Descadastro confirmado</h1>
      <p>Você não receberá mais emails do Facilito.<br>Se mudar de ideia, entre em contato conosco.</p>
      <div class="success">${email}</div>
    ` : `
      <h1>Descadastrar</h1>
      <p>Digite seu email abaixo para ser removido da nossa lista de envios.</p>
      <form method="POST" action="/descadastrar">
        <input type="email" name="email" placeholder="seu@email.com" value="${email || ''}" required>
        <button type="submit">Confirmar descadastro</button>
      </form>
    `}
  </div>
</body>
</html>`);
});

app.post('/descadastrar', (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  if (!email || !email.includes('@')) {
    return res.redirect('/descadastrar?erro=email-invalido');
  }
  unsubscribed.add(email);
  saveUnsubs(unsubscribed);
  const token = unsubToken(email);
  res.redirect(`/descadastrar?email=${encodeURIComponent(email)}&token=${token}`);
});

// Lista de descadastrados (acesso admin)
app.get('/admin/descadastrados', (req, res) => {
  res.json({ total: unsubscribed.size, emails: [...unsubscribed].sort() });
});

// Parse arquivo CSV / XLSX e retorna array de emails
app.post('/parse', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

  try {
    const ext  = path.extname(req.file.originalname).toLowerCase();
    let text = '';

    if (ext === '.csv' || ext === '.txt') {
      text = req.file.buffer.toString('utf-8');
    } else if (ext === '.xlsx' || ext === '.xls') {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      wb.SheetNames.forEach(name => {
        text += XLSX.utils.sheet_to_csv(wb.Sheets[name]) + '\n';
      });
    } else {
      return res.status(400).json({ error: 'Formato não suportado. Use CSV, XLSX ou TXT.' });
    }

    const emails = extractEmails(text);
    res.json({ emails, count: emails.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dispara emails com progresso via SSE
app.post('/send', async (req, res) => {
  const { template, emails } = req.body || {};

  if (!TEMPLATES[template])
    return res.status(400).json({ error: 'Template inválido.' });
  if (!Array.isArray(emails) || emails.length === 0)
    return res.status(400).json({ error: 'Nenhum email informado.' });
  if (!process.env.RESEND_API_KEY)
    return res.status(500).json({ error: 'RESEND_API_KEY não configurada.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const resend   = createResend();
  const { subject } = TEMPLATES[template];
  let sent = 0, failed = 0, skipped = 0;

  // Filtra descadastrados
  const targets = emails.filter(e => !unsubscribed.has(e.toLowerCase()));
  skipped = emails.length - targets.length;

  send({ type: 'start', total: targets.length, skipped });

  for (const to of targets) {
    const html = loadHtml(template, to);
    try {
      const { error } = await resend.emails.send({
        from: 'Facilito <onboarding@resend.dev>',
        reply_to: 'joaquim@facilitoapp.com.br',
        to,
        subject,
        html,
      });
      if (error) throw new Error(error.message);
      sent++;
      send({ type: 'progress', email: to, status: 'ok', sent, failed, total: targets.length });
    } catch (e) {
      failed++;
      send({ type: 'progress', email: to, status: 'error', error: e.message, sent, failed, total: targets.length });
    }
    await new Promise(r => setTimeout(r, 300));
  }

  send({ type: 'done', sent, failed, skipped, total: targets.length });
  res.end();
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Plataforma de emails rodando em http://localhost:${PORT}`);
});
