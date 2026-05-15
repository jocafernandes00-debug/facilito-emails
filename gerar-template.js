const {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  ImageRun, TextRun, Header, Footer,
  WidthType, HeightRule, BorderStyle,
  AlignmentType, VerticalAlign, ShadingType,
  convertMillimetersToTwip,
} = require('docx');
const fs   = require('fs');
const path = require('path');

const NAVY   = '061685';
const BLUE   = '3662FF';
const YELLOW = 'F9CE62';
const GRAY   = '9CA3AF';
const BODY   = '374151';

const logoData = fs.readFileSync(path.join(__dirname, '../assets/logo-branco.png'));

const noBorder = () => {
  const s = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  return { top: s, bottom: s, left: s, right: s };
};

// Barra bicolor (ex: amarelo | azul)
function colorBar(c1, c2, heightMm) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE } },
    rows: [new TableRow({
      height: { value: convertMillimetersToTwip(heightMm), rule: HeightRule.EXACT },
      children: [
        new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: c1, fill: c1 }, borders: noBorder(), children: [new Paragraph('')] }),
        new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: c2, fill: c2 }, borders: noBorder(), children: [new Paragraph('')] }),
      ],
    })],
  });
}

// Faixa azul escuro com logo + email
function headerMain() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE } },
    rows: [new TableRow({
      height: { value: convertMillimetersToTwip(16), rule: HeightRule.AT_LEAST },
      children: [
        new TableCell({
          width: { size: 60, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
          borders: noBorder(),
          verticalAlign: VerticalAlign.CENTER,
          margins: { left: convertMillimetersToTwip(5), top: convertMillimetersToTwip(3), bottom: convertMillimetersToTwip(3) },
          children: [new Paragraph({
            children: [new ImageRun({ data: logoData, transformation: { width: 95, height: 27 }, type: 'png' })],
          })],
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
          borders: noBorder(),
          verticalAlign: VerticalAlign.CENTER,
          margins: { right: convertMillimetersToTwip(5) },
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'joaquim@facilitoapp.com.br', color: YELLOW, bold: true, size: 16, font: 'Arial' })],
          })],
        }),
      ],
    })],
  });
}

// Linha de acento azul claro
function accentLine() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE } },
    rows: [new TableRow({
      height: { value: convertMillimetersToTwip(2), rule: HeightRule.EXACT },
      children: [new TableCell({
        width: { size: 100, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: BLUE, fill: BLUE },
        borders: noBorder(),
        children: [new Paragraph('')],
      })],
    })],
  });
}

// Faixa rodapé azul escuro
function footerMain() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE } },
    rows: [new TableRow({
      height: { value: convertMillimetersToTwip(11), rule: HeightRule.AT_LEAST },
      children: [
        new TableCell({
          width: { size: 65, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
          borders: noBorder(),
          verticalAlign: VerticalAlign.CENTER,
          margins: { left: convertMillimetersToTwip(5) },
          children: [new Paragraph({
            children: [new TextRun({ text: 'Facilito  |  Ecossistema digital de soluções do dia a dia', color: 'AAAAAA', size: 14, font: 'Arial' })],
          })],
        }),
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
          borders: noBorder(),
          verticalAlign: VerticalAlign.CENTER,
          margins: { right: convertMillimetersToTwip(5) },
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'buscar.facilitoapp.com.br', color: 'AAAAAA', size: 14, font: 'Arial' })],
          })],
        }),
      ],
    })],
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Arial', size: 21, color: BODY },
        paragraph: { spacing: { line: 360 } },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
        margin: {
          top:    convertMillimetersToTwip(48),
          bottom: convertMillimetersToTwip(36),
          left:   convertMillimetersToTwip(25),
          right:  convertMillimetersToTwip(25),
          header: convertMillimetersToTwip(0),
          footer: convertMillimetersToTwip(0),
        },
      },
    },
    headers: {
      default: new Header({
        children: [
          colorBar(YELLOW, BLUE, 3),
          headerMain(),
          accentLine(),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          colorBar(BLUE, YELLOW, 2),
          footerMain(),
        ],
      }),
    },
    children: [
      // Título do documento
      new Paragraph({
        children: [new TextRun({ text: 'TÍTULO DO DOCUMENTO', bold: true, color: NAVY, size: 26, font: 'Arial' })],
        spacing: { after: 100 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'EBEBEB', space: 4 } },
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      // Saudação
      new Paragraph({
        children: [new TextRun({ text: 'Prezado(a),', color: BODY, size: 21, font: 'Arial' })],
        spacing: { after: 200 },
      }),
      // Corpo
      new Paragraph({
        children: [new TextRun({ text: 'Conteúdo do documento aqui.', color: BODY, size: 21, font: 'Arial' })],
        spacing: { after: 200, line: 360 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Atenciosamente,', color: BODY, size: 21, font: 'Arial' })],
        spacing: { after: 1400 },
      }),
      // Assinatura
      new Paragraph({
        children: [new TextRun({ text: 'Joaquim Fernandes', bold: true, color: NAVY, size: 19, font: 'Arial' })],
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: '374151', space: 2 } },
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Fundador  |  Facilito', color: GRAY, size: 17, font: 'Arial' })],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = path.join(__dirname, 'Facilito — Template Timbrado.docx');
  fs.writeFileSync(out, buf);
  console.log('Gerado: Facilito — Template Timbrado.docx');
}).catch(e => { console.error(e); process.exit(1); });
