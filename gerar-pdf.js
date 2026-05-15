const puppeteer = require('puppeteer');
const path = require('path');

const ARQUIVOS = [
  { html: 'print-contato-oficial.html',         pdf: 'Facilito — Contato Oficial.pdf' },
  { html: 'print-institucional.html',           pdf: 'Facilito — Apresentação Institucional.pdf' },
  { html: 'print-termos-de-uso.html',           pdf: 'Facilito — Termos de Uso.pdf' },
  { html: 'print-politica-de-privacidade.html', pdf: 'Facilito — Política de Privacidade.pdf' },
];

async function gerar() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.emulateMediaType('print');

  for (const { html, pdf } of ARQUIVOS) {
    const htmlPath = 'file:///' + path.join(__dirname, html).replace(/\\/g, '/');
    const pdfPath  = path.join(__dirname, pdf);

    await page.goto(htmlPath, { waitUntil: 'domcontentloaded' });
    await page.pdf({
      path: pdfPath,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    console.log('Gerado: ' + pdf);
  }

  await browser.close();
}

gerar().catch(err => { console.error(err); process.exit(1); });
