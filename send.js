// Disparo de emails Facilito via SMTP (Hostinger)
//
// Uso individual:
//   node emails/send.js <template> <email>
//   node emails/send.js precadastro joao@email.com
//
// Disparo em massa (lista CSV):
//   node emails/send.js precadastro lista.csv
//
// Templates: precadastro | beta | lancamento
//
// .env.local necessario:
//   SMTP_USER=joaquim@facilitoapp.com.br
//   SMTP_PASS=sua_senha_aqui

require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');
const fs   = require('fs');
const path = require('path');

const TEMPLATES = {
  precadastro: {
    subject: 'Você está na lista do Facilito!',
    file: 'email-precadastro.html',
  },
  beta: {
    subject: 'Você foi selecionado para testar o Facilito',
    file: 'email-beta.html',
  },
  lancamento: {
    subject: 'O Facilito chegou! Acesse agora',
    file: 'email-lancamento.html',
  },
  contato: {
    subject: 'Contato Oficial — Facilito',
    file: 'timbrado-contato-oficial.html',
  },
  institucional: {
    subject: 'Apresentação Institucional — Facilito',
    file: 'timbrado-institucional.html',
  },
  documentos: {
    subject: 'Documentos Institucionais — Facilito',
    file: 'email-documentos.html',
  },
};

function loadHtml(template) {
  const filePath = path.join(__dirname, TEMPLATES[template].file);
  return fs.readFileSync(filePath, 'utf-8')
    .replaceAll('{{IMAGE_BASE_URL}}', process.env.IMAGE_BASE_URL || '')
    .replaceAll('{{UNSUBSCRIBE_URL}}', process.env.UNSUBSCRIBE_URL || '#');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createTransport() {
  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendOne(transport, template, to) {
  const { subject } = TEMPLATES[template];
  const html = loadHtml(template);

  const payload = {
    from: `Facilito <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  };

  // Anexos PDF para templates institucionais
  if (template === 'contato' || template === 'institucional' || template === 'documentos') {
    const pdfs = [
      { name: 'Facilito — Contato Oficial.pdf',            path: path.join(__dirname, 'Facilito — Contato Oficial.pdf') },
      { name: 'Facilito — Apresentação Institucional.pdf', path: path.join(__dirname, 'Facilito — Apresentação Institucional.pdf') },
      { name: 'Facilito — Termos de Uso.pdf',              path: path.join(__dirname, 'Facilito — Termos de Uso.pdf') },
      { name: 'Facilito — Política de Privacidade.pdf',    path: path.join(__dirname, 'Facilito — Política de Privacidade.pdf') },
    ];
    payload.attachments = pdfs
      .filter(p => fs.existsSync(p.path))
      .map(p => ({ filename: p.name, path: p.path }));
  }

  await transport.sendMail(payload);
}

async function main() {
  const [template, target] = process.argv.slice(2);

  if (!template || !target) {
    console.error('Uso: node emails/send.js <template> <email|arquivo.csv>');
    console.error('Templates: ' + Object.keys(TEMPLATES).join(', '));
    process.exit(1);
  }

  if (!TEMPLATES[template]) {
    console.error('Template invalido. Use: ' + Object.keys(TEMPLATES).join(', '));
    process.exit(1);
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('SMTP_USER e SMTP_PASS nao definidos em .env.local');
    process.exit(1);
  }

  const transport = createTransport();

  if (target.endsWith('.csv')) {
    const emails = fs.readFileSync(target, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && l.includes('@'));

    console.log(`Disparando "${template}" para ${emails.length} emails...`);
    let ok = 0, fail = 0;

    for (const email of emails) {
      try {
        await sendOne(transport, template, email);
        console.log(`  enviado -> ${email}`);
        ok++;
        await sleep(500);
      } catch (e) {
        console.error(`  ERRO -> ${email}: ${e.message}`);
        fail++;
      }
    }

    console.log(`\nFinalizado: ${ok} enviados, ${fail} erros.`);
  } else {
    try {
      await sendOne(transport, template, target);
      console.log(`Email "${template}" enviado para ${target}`);
    } catch (e) {
      console.error('Erro:', e.message);
      process.exit(1);
    }
  }
}

main();
