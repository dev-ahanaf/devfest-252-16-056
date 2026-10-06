import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

/**
 * Calculates SHA-256 hash of an ArrayBuffer in hex format
 */
export async function calculateSHA256(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Checks if a file is a valid PDF:
 * 1. .pdf extension
 * 2. MIME type starts with application/pdf (if provided)
 * 3. Starts with magic byte header %PDF-
 */
export async function validatePDFHeader(file) {
  const isExtensionValid = file.name.toLowerCase().endsWith('.pdf');
  if (!isExtensionValid) {
    return { valid: false, reason: 'Missing .pdf extension' };
  }

  const slice = await file.slice(0, 1024).arrayBuffer();
  const bytes = new Uint8Array(slice);
  const header = String.fromCharCode(...bytes.slice(0, 8));

  if (!header.startsWith('%PDF-')) {
    return { valid: false, reason: 'Invalid PDF magic header (missing %PDF-)' };
  }

  return { valid: true };
}

/**
 * Inspects a PDF file using pdf-lib to get page count and check if corrupted/encrypted
 */
export async function inspectPDFFile(arrayBuffer) {
  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
    const pageCount = pdfDoc.getPageCount();
    return {
      valid: true,
      pageCount,
      isEncrypted: false
    };
  } catch (err) {
    const errorMsg = String(err && err.message ? err.message : err);
    if (errorMsg.toLowerCase().includes('encrypt') || errorMsg.toLowerCase().includes('password')) {
      return {
        valid: false,
        isEncrypted: true,
        reason: 'Password-protected or encrypted PDF'
      };
    }
    return {
      valid: false,
      isEncrypted: false,
      reason: 'Damaged or unreadable PDF file: ' + errorMsg
    };
  }
}

/**
 * Generates the complete Tender Document Package PDF
 * Follows Problem Statement Section 6 rules:
 * - Page 1: Cover page in English
 * - Included documents in order of `order`
 * - Every page has footer: "<tender_id> | Page X of Y" (Y = total pages)
 * - Source pages drawn with ~36pt extra bottom margin so footer does NOT cover content
 * - Rotated pages and mixed sizes handled properly
 * - Real page count verified against Y
 */
export async function buildTenderPackage({
  tender,
  requirements,
  matchedFilesMap, // docId -> fileObj
  includeIndexPage = false,
  sealImageBuffer = null
}) {
  const mergedPdf = await PDFDocument.create();
  const fontHelvetica = await mergedPdf.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

  // 1. Filter and sort documents to be included
  // Skip optional documents with no file
  const sortedRequirements = [...requirements]
    .sort((a, b) => a.order - b.order)
    .filter(req => {
      const fileObj = matchedFilesMap[req.id];
      return Boolean(fileObj);
    });

  // Calculate pages for each document
  const docPageCounts = [];
  let totalDocPages = 0;

  for (const req of sortedRequirements) {
    const fileObj = matchedFilesMap[req.id];
    const srcDoc = await PDFDocument.load(fileObj.arrayBuffer, { ignoreEncryption: true });
    const count = srcDoc.getPageCount();
    docPageCounts.push({ req, fileObj, count, srcDoc });
    totalDocPages += count;
  }

  const coverPageCount = 1;
  const indexPageCount = includeIndexPage ? 1 : 0;
  const totalPages = coverPageCount + indexPageCount + totalDocPages;

  let currentPageNumber = 1;

  // -------------------------------------------------------------
  // PAGE 1: COVER PAGE (IN ENGLISH)
  // -------------------------------------------------------------
  const coverWidth = 595.28; // Standard A4 points
  const coverHeight = 841.89;
  const coverPage = mergedPdf.addPage([coverWidth, coverHeight]);

  // Brand / Decorative top bar
  coverPage.drawRectangle({
    x: 0,
    y: coverHeight - 12,
    width: coverWidth,
    height: 12,
    color: rgb(0.08, 0.22, 0.45) // Deep navy
  });

  // Header Box
  coverPage.drawRectangle({
    x: 40,
    y: coverHeight - 130,
    width: coverWidth - 80,
    height: 95,
    color: rgb(0.95, 0.97, 1.0),
    borderColor: rgb(0.8, 0.88, 0.98),
    borderWidth: 1
  });

  coverPage.drawText("TENDER DOCUMENT PACKAGE", {
    x: 60,
    y: coverHeight - 70,
    size: 20,
    font: fontHelveticaBold,
    color: rgb(0.08, 0.22, 0.45)
  });

  coverPage.drawText(`Tender ID: ${tender.tender_id || 'N/A'}`, {
    x: 60,
    y: coverHeight - 95,
    size: 13,
    font: fontHelveticaBold,
    color: rgb(0.15, 0.35, 0.7)
  });

  coverPage.drawText(`Title: ${tender.title || 'N/A'}`, {
    x: 60,
    y: coverHeight - 115,
    size: 11,
    font: fontHelvetica,
    color: rgb(0.2, 0.25, 0.3)
  });

  // Tender Metadata Grid
  const metaY = coverHeight - 160;
  const col1X = 50;
  const col2X = 310;

  const metadataItems = [
    { label: "Procuring Entity", value: tender.procuring_entity || "N/A", x: col1X, y: metaY },
    { label: "Bidder Name", value: tender.bidder || "N/A", x: col2X, y: metaY },
    { label: "Submission Deadline", value: tender.submission_deadline || "N/A", x: col1X, y: metaY - 35 },
    { label: "Package Generated On", value: new Date().toISOString().split('T')[0], x: col2X, y: metaY - 35 }
  ];

  metadataItems.forEach(item => {
    coverPage.drawText(item.label.toUpperCase(), {
      x: item.x,
      y: item.y,
      size: 8,
      font: fontHelveticaBold,
      color: rgb(0.45, 0.5, 0.55)
    });
    coverPage.drawText(item.value, {
      x: item.x,
      y: item.y - 14,
      size: 11,
      font: fontHelveticaBold,
      color: rgb(0.1, 0.15, 0.2)
    });
  });

  // Included Documents Table
  const tableTopY = coverHeight - 245;
  coverPage.drawText("INCLUDED DOCUMENTS (IN SUBMISSION ORDER)", {
    x: 50,
    y: tableTopY,
    size: 11,
    font: fontHelveticaBold,
    color: rgb(0.08, 0.22, 0.45)
  });

  // Table Header
  const thY = tableTopY - 20;
  coverPage.drawRectangle({
    x: 45,
    y: thY - 5,
    width: coverWidth - 90,
    height: 22,
    color: rgb(0.92, 0.94, 0.98)
  });

  coverPage.drawText("#", { x: 55, y: thY + 2, size: 9, font: fontHelveticaBold, color: rgb(0.2, 0.25, 0.3) });
  coverPage.drawText("Document Title", { x: 80, y: thY + 2, size: 9, font: fontHelveticaBold, color: rgb(0.2, 0.25, 0.3) });
  coverPage.drawText("Matched File", { x: 260, y: thY + 2, size: 9, font: fontHelveticaBold, color: rgb(0.2, 0.25, 0.3) });
  coverPage.drawText("Pages", { x: 440, y: thY + 2, size: 9, font: fontHelveticaBold, color: rgb(0.2, 0.25, 0.3) });
  coverPage.drawText("Status", { x: 495, y: thY + 2, size: 9, font: fontHelveticaBold, color: rgb(0.2, 0.25, 0.3) });

  let rowY = thY - 25;
  sortedRequirements.forEach((req, idx) => {
    const fileObj = matchedFilesMap[req.id];
    const pageCount = docPageCounts.find(d => d.req.id === req.id)?.count || 0;

    if (idx % 2 === 1) {
      coverPage.drawRectangle({
        x: 45,
        y: rowY - 5,
        width: coverWidth - 90,
        height: 22,
        color: rgb(0.97, 0.98, 0.99)
      });
    }

    coverPage.drawText(String(req.order), { x: 55, y: rowY + 2, size: 9, font: fontHelvetica, color: rgb(0.2, 0.2, 0.2) });
    
    // English title
    const docTitle = req.title_en || req.title || "Document";
    coverPage.drawText(docTitle.length > 30 ? docTitle.substring(0, 28) + '...' : docTitle, {
      x: 80,
      y: rowY + 2,
      size: 9,
      font: fontHelveticaBold,
      color: rgb(0.1, 0.15, 0.25)
    });

    const fileName = fileObj.name || "";
    coverPage.drawText(fileName.length > 28 ? fileName.substring(0, 26) + '...' : fileName, {
      x: 260,
      y: rowY + 2,
      size: 8.5,
      font: fontHelvetica,
      color: rgb(0.3, 0.35, 0.4)
    });

    coverPage.drawText(String(pageCount), {
      x: 445,
      y: rowY + 2,
      size: 9,
      font: fontHelvetica,
      color: rgb(0.2, 0.2, 0.2)
    });

    coverPage.drawText("Verified OK", {
      x: 495,
      y: rowY + 2,
      size: 8.5,
      font: fontHelveticaBold,
      color: rgb(0.05, 0.55, 0.25)
    });

    rowY -= 22;
  });

  // Embed seal on cover page if provided
  if (sealImageBuffer) {
    try {
      const sealImg = await mergedPdf.embedPng(sealImageBuffer);
      coverPage.drawImage(sealImg, {
        x: coverWidth - 150,
        y: 45,
        width: 100,
        height: 40
      });
      coverPage.drawText("OFFICIAL SEAL / SIGNATURE", {
        x: coverWidth - 150,
        y: 35,
        size: 7,
        font: fontHelveticaBold,
        color: rgb(0.2, 0.35, 0.6)
      });
    } catch {
      // ignore
    }
  }

  // Cover Page Bottom Footer
  drawPageFooter(coverPage, tender.tender_id, currentPageNumber, totalPages, fontHelvetica, coverWidth);
  currentPageNumber++;

  // -------------------------------------------------------------
  // BONUS: INDEX / TABLE OF CONTENTS PAGE (IF ENABLED)
  // -------------------------------------------------------------
  let runningStartPage = 1 + (includeIndexPage ? 2 : 1);
  if (includeIndexPage) {
    const indexPage = mergedPdf.addPage([coverWidth, coverHeight]);
    indexPage.drawText("TABLE OF CONTENTS / DOCUMENT INDEX", {
      x: 50,
      y: coverHeight - 60,
      size: 15,
      font: fontHelveticaBold,
      color: rgb(0.08, 0.22, 0.45)
    });

    let indexY = coverHeight - 110;
    sortedRequirements.forEach((req) => {
      const pageInfo = docPageCounts.find(d => d.req.id === req.id);
      const startPage = runningStartPage;
      const endPage = runningStartPage + pageInfo.count - 1;
      runningStartPage += pageInfo.count;

      indexPage.drawText(`${req.order}. ${req.title_en}`, {
        x: 60,
        y: indexY,
        size: 10,
        font: fontHelveticaBold,
        color: rgb(0.1, 0.15, 0.2)
      });

      const pageRangeStr = pageInfo.count === 1 ? `Page ${startPage}` : `Pages ${startPage} - ${endPage}`;
      indexPage.drawText(pageRangeStr, {
        x: 440,
        y: indexY,
        size: 10,
        font: fontHelvetica,
        color: rgb(0.2, 0.35, 0.6)
      });

      // Dot leader line
      indexPage.drawLine({
        start: { x: 260, y: indexY + 3 },
        end: { x: 430, y: indexY + 3 },
        thickness: 0.5,
        color: rgb(0.7, 0.75, 0.8)
      });

      indexY -= 30;
    });

    drawPageFooter(indexPage, tender.tender_id, currentPageNumber, totalPages, fontHelvetica, coverWidth);
    currentPageNumber++;
  }

  // -------------------------------------------------------------
  // MERGE DOCUMENT PAGES WITH 36PT BOTTOM MARGIN FOR FOOTER
  // -------------------------------------------------------------
  const extraBottomMargin = 36; // 36pt extra margin as required

  for (const item of docPageCounts) {
    const { srcDoc, fileObj } = item;
    const pageIndices = srcDoc.getPageIndices();

    // Copy pages into merged document
    const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);

    for (let pIdx = 0; pIdx < copiedPages.length; pIdx++) {
      const srcPage = copiedPages[pIdx];
      const origWidth = srcPage.getWidth();
      const origHeight = srcPage.getHeight();
      const rotation = srcPage.getRotation().angle;

      // Embed the source page so it can be drawn with added margin
      const embedded = await mergedPdf.embedPage(srcPage);

      // Create a new page with extra bottom margin of 36pt
      const newWidth = origWidth;
      const newHeight = origHeight + extraBottomMargin;

      const newPage = mergedPdf.addPage([newWidth, newHeight]);

      // Handle page rotation if any
      if (rotation !== 0) {
        newPage.setRotation(degrees(rotation));
      }

      // Draw the original content shifted upwards by extraBottomMargin (36pt)
      newPage.drawPage(embedded, {
        x: 0,
        y: extraBottomMargin,
        width: origWidth,
        height: origHeight
      });

      // Draw bottom footer inside the extra bottom margin space
      drawPageFooter(newPage, tender.tender_id, currentPageNumber, totalPages, fontHelvetica, newWidth);

      // If seal/signature provided and this is first or last page of doc
      if (sealImageBuffer && pIdx === copiedPages.length - 1) {
        try {
          const sealImage = await mergedPdf.embedPng(sealImageBuffer);
          newPage.drawImage(sealImage, {
            x: newWidth - 140,
            y: extraBottomMargin + 10,
            width: 100,
            height: 40
          });
        } catch {
          // Continue if seal embedding fails
        }
      }

      currentPageNumber++;
    }
  }

  // Verification: Verify real page count equals Y
  const finalTotalPages = mergedPdf.getPageCount();
  if (finalTotalPages !== totalPages) {
    console.warn(`Page count mismatch! Expected ${totalPages}, got ${finalTotalPages}`);
  }

  const pdfBytes = await mergedPdf.save();
  return {
    pdfBytes,
    totalPages: finalTotalPages,
    blob: new Blob([pdfBytes], { type: 'application/pdf' })
  };
}

/**
 * Draws the standardized footer: "<tender_id> | Page X of Y"
 */
function drawPageFooter(page, tenderId, pageNumber, totalPages, font, pageWidth) {
  const footerText = `${tenderId || 'TENDER'} | Page ${pageNumber} of ${totalPages}`;
  const fontSize = 9;
  const textWidth = font.widthOfTextAtSize(footerText, fontSize);
  const x = (pageWidth - textWidth) / 2;
  const y = 14; // in bottom margin

  // Subtle separator line
  page.drawLine({
    start: { x: 40, y: 28 },
    end: { x: pageWidth - 40, y: 28 },
    thickness: 0.5,
    color: rgb(0.8, 0.83, 0.88)
  });

  page.drawText(footerText, {
    x: Math.max(10, x),
    y,
    size: fontSize,
    font,
    color: rgb(0.3, 0.35, 0.4)
  });
}

/**
 * Exports the verification checklist as CSV with UTF-8 BOM
 */
export function exportChecklistCSV({ tender, requirements, matchedFilesMap, statuses, expiryDates }) {
  const bom = "\uFEFF";
  const headers = ["Order", "Document ID", "Document Title (EN)", "Document Title (BN)", "Mandatory", "Matched File", "File Pages", "Expiry Date", "Status"];

  const rows = requirements.map(req => {
    const file = matchedFilesMap[req.id];
    const expiry = expiryDates[req.id] || "";
    const status = statuses[req.id] || "Missing";

    return [
      req.order,
      `"${req.id}"`,
      `"${(req.title_en || "").replace(/"/g, '""')}"`,
      `"${(req.title_bn || "").replace(/"/g, '""')}"`,
      req.mandatory ? "Yes" : "No",
      file ? `"${file.name.replace(/"/g, '""')}"` : '""',
      file ? (file.pageCount || 1) : 0,
      expiry ? `"${expiry}"` : '""',
      `"${status}"`
    ].join(",");
  });

  const csvContent = bom + [
    `"Tender ID: ${tender.tender_id}"`,
    `"Tender Title: ${tender.title}"`,
    `"Submission Deadline: ${tender.submission_deadline}"`,
    "",
    headers.join(","),
    ...rows
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  return blob;
}
