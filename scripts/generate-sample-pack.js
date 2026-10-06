import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

async function generateSamplePack() {
  const outDir = path.resolve('sample-pack/documents');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const helvetica = StandardFonts.Helvetica;
  const helveticaBold = StandardFonts.HelveticaBold;

  // Helper to create a clean PDF
  async function createDoc({ title, subtitle, pagesCount = 1, rotatePages = [] }) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(helvetica);
    const fontBold = await doc.embedFont(helveticaBold);

    for (let i = 1; i <= pagesCount; i++) {
      const page = doc.addPage([595.28, 841.89]);
      if (rotatePages.includes(i)) {
        page.setRotation(degrees(90));
      }

      page.drawText(title, {
        x: 50,
        y: 780,
        size: 18,
        font: fontBold,
        color: rgb(0.1, 0.2, 0.4)
      });

      page.drawText(`${subtitle} — Page ${i} of ${pagesCount}`, {
        x: 50,
        y: 750,
        size: 12,
        font,
        color: rgb(0.3, 0.35, 0.4)
      });

      // Sample mock body text
      page.drawText(`This is an official submission document for Tender ID: T-2026-0417.\nBidder: Example Company Ltd.\nProcuring Entity: Example Directorate.`, {
        x: 50,
        y: 700,
        size: 10,
        font,
        color: rgb(0.2, 0.2, 0.2),
        lineHeight: 14
      });

      // Simple box
      page.drawRectangle({
        x: 50,
        y: 300,
        width: 495.28,
        height: 350,
        borderColor: rgb(0.8, 0.85, 0.9),
        borderWidth: 1,
        color: rgb(0.98, 0.99, 1.0)
      });

      page.drawText(`[Document Content Page ${i} - Verified for authenticity]`, {
        x: 70,
        y: 620,
        size: 11,
        font,
        color: rgb(0.4, 0.45, 0.5)
      });
    }

    return await doc.save();
  }

  // 1. Trade License (3 pages)
  const tradeBytes = await createDoc({
    title: "TRADE LICENSE (OFFICIAL RECORD)",
    subtitle: "Trade License No. TR-883921 / 2024",
    pagesCount: 3
  });
  fs.writeFileSync(path.join(outDir, "Trade_License.pdf"), tradeBytes);

  // 2. TIN Certificate (2 pages)
  const tinBytes = await createDoc({
    title: "TAXPAYER IDENTIFICATION CERTIFICATE",
    subtitle: "TIN: 9940-2819-3810",
    pagesCount: 2
  });
  fs.writeFileSync(path.join(outDir, "TIN_Certificate.pdf"), tinBytes);

  // 3. VAT Certificate (2 pages)
  const vatBytes = await createDoc({
    title: "VAT REGISTRATION CERTIFICATE",
    subtitle: "BIN: 001928374-0101 (Expired 2025-09-30)",
    pagesCount: 2
  });
  fs.writeFileSync(path.join(outDir, "VAT_Certificate.pdf"), vatBytes);

  // 4. VAT Certificate Copy (Duplicate file testing identical SHA-256)
  fs.writeFileSync(path.join(outDir, "VAT_Certificate_copy.pdf"), vatBytes);

  // 5. VAT Certificate Renewed (Valid expiry 2027-12-31 to resolve problem)
  const vatRenewedBytes = await createDoc({
    title: "VAT REGISTRATION CERTIFICATE (RENEWED)",
    subtitle: "BIN: 001928374-0101 (Valid until 2027-12-31)",
    pagesCount: 2
  });
  fs.writeFileSync(path.join(outDir, "VAT_Certificate_Renewed.pdf"), vatRenewedBytes);

  // 6. Bank Solvency Letter (1 page)
  const bankBytes = await createDoc({
    title: "BANK SOLVENCY CERTIFICATE",
    subtitle: "Issued by Prime Bank Ltd.",
    pagesCount: 1
  });
  fs.writeFileSync(path.join(outDir, "Bank_Solvency.pdf"), bankBytes);

  // 7. Experience Certificate (5 pages)
  const expBytes = await createDoc({
    title: "PAST PROJECT EXPERIENCE CERTIFICATE",
    subtitle: "Relevant Completion Records",
    pagesCount: 5
  });
  fs.writeFileSync(path.join(outDir, "Experience_Certificate.pdf"), expBytes);

  // 8. Technical Proposal (12 pages, with page 6 rotated 90 degrees)
  const techBytes = await createDoc({
    title: "TECHNICAL PROPOSAL & SPECIFICATIONS",
    subtitle: "IT Infrastructure Architecture",
    pagesCount: 12,
    rotatePages: [6]
  });
  fs.writeFileSync(path.join(outDir, "Technical_Proposal.pdf"), techBytes);

  // 9. Financial Proposal (8 pages)
  const finBytes = await createDoc({
    title: "FINANCIAL PROPOSAL & BILL OF QUANTITIES",
    subtitle: "Tender Price Schedule",
    pagesCount: 8
  });
  fs.writeFileSync(path.join(outDir, "Financial_Proposal.pdf"), finBytes);

  // 10. Corrupted PDF for error handling testing
  fs.writeFileSync(path.join(outDir, "Corrupted_File.pdf"), "%PDF-1.4\nBROKEN_CORRUPTED_STREAM_DATA_ERROR_EOF");

  // 11. Non-PDF file to test non-PDF rejection
  fs.writeFileSync(path.join(outDir, "Invalid_Document.txt"), "This is plain text, not a PDF file.");

  console.log("Sample pack documents generated in sample-pack/documents/ successfully!");
}

generateSamplePack().catch(console.error);
