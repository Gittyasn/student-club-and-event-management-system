/* global Buffer, process */
// eslint-disable-next-line no-unused-vars
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs';

const generateTest = async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  // eslint-disable-next-line no-unused-vars
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText('TEST CERTIFICATE', { x: 160, y: height - 80, size: 20, font });
  page.drawText('This certifies that', { x: 220, y: height - 120, size: 12, font: regular });
  page.drawText('Jane Doe', { x: 230, y: height - 150, size: 18, font });
  page.drawText('participated in Example Event', { x: 180, y: height - 180, size: 12, font: regular });

  const verification = 'https://example.com/verify/TEST1234';
  const dataUrl = await QRCode.toDataURL(verification);
  const base64 = dataUrl.split(',')[1];
  const imgBytes = Buffer.from(base64, 'base64');
  const pngImage = await pdfDoc.embedPng(imgBytes);
  page.drawImage(pngImage, { x: 40, y: 40, width: 80, height: 80 });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('test_certificate.pdf', pdfBytes);
  console.log('test_certificate.pdf written');
};

generateTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
