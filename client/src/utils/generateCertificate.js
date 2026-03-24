import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as QRCode from 'qrcode';

// ─── Color helpers ─────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
};

const COLORS = {
    participation: { primary: rgb(0.1, 0.34, 0.85), accent: rgb(0.07, 0.7, 0.5), text: rgb(0.1, 0.1, 0.2) },
    winner: { primary: rgb(0.7, 0.35, 0.0), accent: rgb(0.98, 0.75, 0.14), text: rgb(0.15, 0.08, 0.0) },
    merit: { primary: rgb(0.38, 0.1, 0.7), accent: rgb(0.55, 0.35, 0.95), text: rgb(0.1, 0.05, 0.15) },
};

const CERT_CONTENT = {
    participation: {
        title: 'CERTIFICATE OF PARTICIPATION',
        body: 'This is to certify that',
        achievement: 'has successfully participated in'
    },
    winner: {
        title: 'CERTIFICATE OF ACHIEVEMENT',
        body: 'This is to certify that',
        achievement: 'has achieved outstanding excellence in'
    },
    merit: {
        title: 'CERTIFICATE OF MERIT',
        body: 'This is to certify that',
        achievement: 'has demonstrated exceptional performance in'
    }
};

// ─── Draw decorative border ────────────────────────────────────
const drawBorder = (page, width, height, colors) => {
    // Outer border
    page.drawRectangle({ x: 15, y: 15, width: width - 30, height: height - 30, borderColor: colors.primary, borderWidth: 4 });
    // Inner border
    page.drawRectangle({ x: 25, y: 25, width: width - 50, height: height - 50, borderColor: colors.accent, borderWidth: 1.5 });
    // Corner accents
    const corners = [[18, height - 35], [18, 18], [width - 50, height - 35], [width - 50, 18]];
    corners.forEach(([x, y]) => {
        page.drawRectangle({ x, y, width: 14, height: 14, color: colors.accent, opacity: 0.8 });
    });
};

// ─── Draw watermark ────────────────────────────────────────────
const drawWatermark = async (page, font, width, height, text = 'OFFICIAL') => {
    page.drawText(text, {
        x: width / 2 - 80,
        y: height / 2 - 20,
        size: 64,
        font,
        color: rgb(0.85, 0.85, 0.9),
        opacity: 0.08,
        rotate: degrees(340)
    });
};

// ─── Draw header bar ──────────────────────────────────────────
const drawHeaderBar = (page, width, height, colors) => {
    page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: colors.primary });
    page.drawRectangle({ x: 0, y: 0, width, height: 8, color: colors.primary });
    // Accent side bars
    page.drawRectangle({ x: 0, y: 8, width: 8, height: height - 16, color: colors.accent, opacity: 0.4 });
    page.drawRectangle({ x: width - 8, y: 8, width: 8, height: height - 16, color: colors.accent, opacity: 0.4 });
};

// ─── Main PDF generator ────────────────────────────────────────
export const generateCertificatePDF = async ({
    studentName,
    eventTitle,
    clubName,
    eventDate,
    verificationUrl,
    certificateId,
    certType = 'participation',
    rank = null,
    score = null,
    maxScore = null,
    grade = null,
    prizeTitle = null,
    certificateNumber = null,
    teamName = null,
    projectTitle = null
}) => {
    const pdfDoc = await PDFDocument.create();
    // A4 Landscape: 841 x 595 pts
    const page = pdfDoc.addPage([841, 595]);
    const { width, height } = page.getSize();

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const oblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const colors = COLORS[certType] || COLORS.participation;
    const content = CERT_CONTENT[certType] || CERT_CONTENT.participation;

    // Background
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.98, 1.0) });

    // Subtle gradient bands
    page.drawRectangle({ x: 0, y: height * 0.7, width, height: height * 0.3, color: colors.primary, opacity: 0.04 });
    page.drawRectangle({ x: 0, y: 0, width, height: height * 0.15, color: colors.accent, opacity: 0.05 });

    // Structural elements
    drawHeaderBar(page, width, height, colors);
    drawBorder(page, width, height, colors);
    await drawWatermark(page, boldFont, width, height);

    // ── Institution name (top center) ──────────────────────────
    const instName = 'STUDENT CLUB & EVENT MANAGEMENT';
    const instW = boldFont.widthOfTextAtSize(instName, 10);
    page.drawText(instName, {
        x: (width - instW) / 2, y: height - 32,
        size: 10, font: boldFont, color: colors.primary, opacity: 0.8
    });

    // ── Certificate type badge ─────────────────────────────────
    const badge = certType === 'winner' ? '🏆 WINNER' : certType === 'merit' ? '⭐ MERIT' : '🎓 PARTICIPATION';
    const badgeW = boldFont.widthOfTextAtSize(badge, 9);
    page.drawRectangle({ x: (width - badgeW - 20) / 2, y: height - 62, width: badgeW + 20, height: 18, color: colors.accent, borderRadius: 4 });
    page.drawText(badge, { x: (width - badgeW) / 2, y: height - 58, size: 9, font: boldFont, color: rgb(1, 1, 1) });

    // ── Main title ─────────────────────────────────────────────
    const titleW = boldFont.widthOfTextAtSize(content.title, 28);
    page.drawText(content.title, {
        x: (width - titleW) / 2, y: height - 115,
        size: 28, font: boldFont, color: colors.primary
    });

    // Title underline
    page.drawLine({
        start: { x: (width - titleW) / 2, y: height - 120 },
        end: { x: (width + titleW) / 2, y: height - 120 },
        thickness: 2, color: colors.accent
    });

    // ── Body text ──────────────────────────────────────────────
    const bodyText = content.body;
    const bodyW = regularFont.widthOfTextAtSize(bodyText, 13);
    page.drawText(bodyText, { x: (width - bodyW) / 2, y: height - 160, size: 13, font: regularFont, color: colors.text });

    // ── Student name (large, centered) ────────────────────────
    const nameSize = studentName.length > 25 ? 30 : 36;
    const nameW = boldFont.widthOfTextAtSize(studentName, nameSize);
    page.drawText(studentName, {
        x: (width - nameW) / 2, y: height - 210,
        size: nameSize, font: boldFont, color: colors.primary
    });
    // Name underline
    page.drawLine({
        start: { x: (width - nameW - 20) / 2, y: height - 215 },
        end: { x: (width + nameW + 20) / 2, y: height - 215 },
        thickness: 1, color: colors.accent, opacity: 0.5
    });

    // ── Achievement phrase ─────────────────────────────────────
    const achW = regularFont.widthOfTextAtSize(content.achievement, 13);
    page.drawText(content.achievement, { x: (width - achW) / 2, y: height - 248, size: 13, font: regularFont, color: colors.text });

    // ── Event title ────────────────────────────────────────────
    const evSize = eventTitle.length > 40 ? 14 : 18;
    const evW = boldFont.widthOfTextAtSize(eventTitle, evSize);
    page.drawText(eventTitle, {
        x: (width - evW) / 2, y: height - 278,
        size: evSize, font: boldFont, color: colors.primary
    });

    // ── Club name ──────────────────────────────────────────────
    if (clubName) {
        const clubStr = `Organized by: ${clubName}`;
        const clubW = oblique.widthOfTextAtSize(clubStr, 11);
        page.drawText(clubStr, { x: (width - clubW) / 2, y: height - 300, size: 11, font: oblique, color: colors.text, opacity: 0.75 });
    }

    // ── Team & Project Details (Hackathon specific) ─────────────
    let nextY = height - 330;
    if (teamName) {
        const teamStr = `Team: ${teamName}`;
        const teamW = boldFont.widthOfTextAtSize(teamStr, 12);
        page.drawText(teamStr, { x: (width - teamW) / 2, y: nextY, size: 12, font: boldFont, color: colors.primary });
        nextY -= 18;
    }
    if (projectTitle) {
        const projStr = `Project: ${projectTitle}`;
        const projW = oblique.widthOfTextAtSize(projStr, 11);
        page.drawText(projStr, { x: (width - projW) / 2, y: nextY, size: 11, font: oblique, color: colors.text });
        nextY -= 25;
    }

    // ── Winner / Merit specific fields ─────────────────────────
    if (certType === 'winner' && (rank || prizeTitle)) {
        let achieveLine = prizeTitle || '';
        if (rank) achieveLine = `Ranked #${rank} · ${achieveLine}`;
        const achieveW = boldFont.widthOfTextAtSize(achieveLine, 14);
        page.drawRectangle({ x: (width - achieveW - 30) / 2, y: nextY, width: achieveW + 30, height: 22, color: colors.accent, borderRadius: 4 });
        page.drawText(achieveLine, { x: (width - achieveW) / 2, y: nextY + 4, size: 14, font: boldFont, color: rgb(1, 1, 1) });
    }

    if (certType === 'merit' && score !== null) {
        const scoreLine = `Score: ${score}${maxScore ? `/${maxScore}` : ''} ${grade ? `(${grade})` : ''}`;
        const scoreW = boldFont.widthOfTextAtSize(scoreLine, 13);
        page.drawRectangle({ x: (width - scoreW - 30) / 2, y: nextY, width: scoreW + 30, height: 22, color: colors.accent, borderRadius: 4 });
        page.drawText(scoreLine, { x: (width - scoreW) / 2, y: nextY + 4, size: 13, font: boldFont, color: rgb(1, 1, 1) });
    }

    // ── Bottom section ──────────────────────────────────────────
    // Date line (left)
    page.drawText(`Date of Issue: ${eventDate || new Date().toLocaleDateString('en-IN')}`, {
        x: 55, y: 85, size: 10, font: regularFont, color: colors.text, opacity: 0.8
    });

    // Divider above bottom section
    page.drawLine({ start: { x: 55, y: 105 }, end: { x: width - 55, y: 105 }, thickness: 0.5, color: colors.accent, opacity: 0.4 });

    // Certificate number (bottom center)
    const certNum = certificateNumber || certificateId?.slice(0, 8).toUpperCase();
    if (certNum) {
        const numStr = `Certificate No: ${certNum}`;
        const numW = regularFont.widthOfTextAtSize(numStr, 9);
        page.drawText(numStr, { x: (width - numW) / 2, y: 60, size: 9, font: regularFont, color: colors.text, opacity: 0.6 });
    }

    // QR Code (right side) ────────────────────────────────────
    try {
        const qrDataUrl = await QRCode.toDataURL(verificationUrl || `https://verify/${certificateId}`, { margin: 1, width: 100 });
        const qrBytes = await fetch(qrDataUrl).then(r => r.arrayBuffer());
        const qrImg = await pdfDoc.embedPng(qrBytes);
        page.drawImage(qrImg, { x: width - 135, y: 35, width: 80, height: 80 });
        page.drawText('Scan to verify', { x: width - 125, y: 28, size: 7.5, font: regularFont, color: colors.text, opacity: 0.55 });
    } catch (qrErr) {
        console.warn('QR generation failed:', qrErr);
    }

    // Signature area (left side bottom) ──────────────────────
    page.drawLine({ start: { x: 55, y: 68 }, end: { x: 200, y: 68 }, thickness: 1, color: colors.text, opacity: 0.4 });
    page.drawText('Authorized Signature', { x: 55, y: 55, size: 8, font: regularFont, color: colors.text, opacity: 0.55 });
    page.drawText('Student Club Administration', { x: 55, y: 45, size: 7, font: oblique, color: colors.text, opacity: 0.45 });

    // Serialise
    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
};

// ─── Export utility to download a blob ────────────────────────
export const downloadPDF = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
};
