if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
}

const express    = require('express');
const multer     = require('multer');
const XLSX       = require('xlsx');
const nodemailer = require('nodemailer');
const fs         = require('fs');
const path       = require('path');

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json());

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

function loadHtml(template) {
  return fs.readFileSync(path.join(__dirname, TEMPLATES[template].file), 'utf-8')
    .replaceAll('{{IMAGE_BASE_URL}}', process.env.IMAGE_BASE_URL || '')
    .replaceAll('{{UNSUBSCRIBE_URL}}', process.env.UNSUBSCRIBE_URL || '#');
}

function createTransport() {
  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
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
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS)
    return res.status(500).json({ error: 'Credenciais SMTP não configuradas.' });

  // SSE para mostrar progresso em tempo real
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const transport = createTransport();
  const html      = loadHtml(template);
  const { subject } = TEMPLATES[template];
  let sent = 0, failed = 0;

  send({ type: 'start', total: emails.length });

  for (const to of emails) {
    try {
      await transport.sendMail({
        from: `Facilito <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      sent++;
      send({ type: 'progress', email: to, status: 'ok', sent, failed, total: emails.length });
    } catch (e) {
      failed++;
      send({ type: 'progress', email: to, status: 'error', error: e.message, sent, failed, total: emails.length });
    }
    await new Promise(r => setTimeout(r, 400));
  }

  send({ type: 'done', sent, failed, total: emails.length });
  res.end();
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Plataforma de emails rodando em http://localhost:${PORT}`);
});
