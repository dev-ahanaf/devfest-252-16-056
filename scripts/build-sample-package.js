import fs from 'fs';
import path from 'path';
import { buildTenderPackage } from '../src/pdf-builder.js';

async function generateSampleOutput() {
  const outputDir = path.resolve('output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reqJson = JSON.parse(fs.readFileSync('sample-pack/requirements.json', 'utf-8'));
  const docDir = path.resolve('sample-pack/documents');

  function getBuffer(fileName) {
    const buf = fs.readFileSync(path.join(docDir, fileName));
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  const filesMap = {
    R01: {
      name: 'Trade_License.pdf',
      arrayBuffer: getBuffer('Trade_License.pdf')
    },
    R02: {
      name: 'TIN_Certificate.pdf',
      arrayBuffer: getBuffer('TIN_Certificate.pdf')
    },
    R03: {
      name: 'VAT_Certificate_Renewed.pdf',
      arrayBuffer: getBuffer('VAT_Certificate_Renewed.pdf')
    },
    R04: {
      name: 'Bank_Solvency.pdf',
      arrayBuffer: getBuffer('Bank_Solvency.pdf')
    },
    R05: {
      name: 'Experience_Certificate.pdf',
      arrayBuffer: getBuffer('Experience_Certificate.pdf')
    },
    R06: {
      name: 'Technical_Proposal.pdf',
      arrayBuffer: getBuffer('Technical_Proposal.pdf')
    },
    R07: {
      name: 'Financial_Proposal.pdf',
      arrayBuffer: getBuffer('Financial_Proposal.pdf')
    }
  };

  const result = await buildTenderPackage({
    tender: reqJson.tender,
    requirements: reqJson.requirements,
    matchedFilesMap: filesMap,
    includeIndexPage: false
  });

  const outFilePath = path.join(outputDir, `${reqJson.tender.tender_id}_Package.pdf`);
  fs.writeFileSync(outFilePath, Buffer.from(result.pdfBytes));
  console.log(`Generated ${outFilePath} successfully with ${result.totalPages} pages.`);
}

generateSampleOutput().catch(console.error);
