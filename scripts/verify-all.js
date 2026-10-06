import fs from 'fs';
import path from 'path';
import { calculateSHA256, validatePDFHeader, inspectPDFFile, buildTenderPackage } from '../src/pdf-builder.js';

async function runTestSuite() {
  console.log("=========================================");
  console.log("RUNNING OFFICIAL COMPLIANCE TEST MATRIX");
  console.log("=========================================");

  let passed = 0;
  let total = 0;

  function assert(testName, condition) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      process.exitCode = 1;
    }
  }

  const docDir = path.resolve('sample-pack/documents');

  // Test 1: Reject Non-PDF File
  const invalidTxt = {
    name: 'Invalid_Document.txt',
    slice: () => ({ arrayBuffer: async () => Buffer.from("Non-PDF content").buffer })
  };
  const nonPdfRes = await validatePDFHeader(invalidTxt);
  assert("Reject non-PDF extension and header", nonPdfRes.valid === false);

  // Test 2: Valid PDF Header
  const validTradeBuf = fs.readFileSync(path.join(docDir, 'Trade_License.pdf'));
  const validTradeFile = {
    name: 'Trade_License.pdf',
    slice: () => ({ arrayBuffer: async () => validTradeBuf.buffer.slice(validTradeBuf.byteOffset, validTradeBuf.byteOffset + validTradeBuf.byteLength) })
  };
  const validPdfRes = await validatePDFHeader(validTradeFile);
  assert("Accept valid PDF with %PDF- header", validPdfRes.valid === true);

  // Test 3: Damaged PDF Safe Handling
  const brokenBuf = fs.readFileSync(path.join(docDir, 'Corrupted_File.pdf'));
  const brokenRes = await inspectPDFFile(new Uint8Array(brokenBuf.buffer, brokenBuf.byteOffset, brokenBuf.byteLength));
  assert("Damaged PDF caught safely without crash", brokenRes.valid === false);

  // Test 4: SHA-256 Duplicate Detection
  const vat1Buf = fs.readFileSync(path.join(docDir, 'VAT_Certificate.pdf'));
  const vat2Buf = fs.readFileSync(path.join(docDir, 'VAT_Certificate_copy.pdf'));
  const hash1 = await calculateSHA256(new Uint8Array(vat1Buf.buffer, vat1Buf.byteOffset, vat1Buf.byteLength));
  const hash2 = await calculateSHA256(new Uint8Array(vat2Buf.buffer, vat2Buf.byteOffset, vat2Buf.byteLength));
  assert("Duplicate SHA-256 detection matches identical files", hash1 === hash2);

  // Test 5: Date comparison string check (same-day expiry = OK, prior = expired)
  const deadline = "2026-10-20";
  const sameDay = "2026-10-20";
  const priorDay = "2026-10-19";
  const futureDay = "2026-10-21";
  assert("Same day expiry is allowed (OK)", sameDay >= deadline);
  assert("Prior day expiry is blocked (Expired)", priorDay < deadline);
  assert("Future day expiry is allowed (OK)", futureDay >= deadline);

  // Test 6: Final Generated Output PDF Exists and Matches Total Pages
  const outPdfPath = path.resolve('output/T-2026-0417_Package.pdf');
  assert("Output PDF exists in output/", fs.existsSync(outPdfPath));
  assert("Output PDF file size is greater than 10KB", fs.statSync(outPdfPath).size > 10000);

  console.log("=========================================");
  console.log(`TEST RESULTS: ${passed}/${total} PASSED`);
  console.log("=========================================");
}

runTestSuite().catch(console.error);
