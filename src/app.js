import { translations } from './i18n.js';
import { calculateSHA256, validatePDFHeader, inspectPDFFile, buildTenderPackage, exportChecklistCSV } from './pdf-builder.js';

// Application State
const state = {
  lang: 'en',
  theme: 'light',
  tender: {
    tender_id: "T-2026-0417",
    title: "Supply of IT Equipment",
    procuring_entity: "Example Directorate",
    bidder: "Example Company Ltd.",
    submission_deadline: "2026-10-20"
  },
  requirements: [],
  uploadedFiles: [], // array of { id, name, size, pageCount, arrayBuffer, sha256, isDuplicate, duplicateGroup, isEncrypted, isDamaged }
  matches: {}, // docId -> fileId
  expiryDates: {}, // docId -> "YYYY-MM-DD"
  statuses: {}, // docId -> "OK" | "Missing" | "Expiry date needed" | "Expired" | "Not provided"
  blockingReasons: [],
  generatedBlob: null,
  includeIndexPage: false,
  sealImageBuffer: null
};

// DOM Elements
const elements = {
  app: document.getElementById('app'),
  btnLangEn: document.getElementById('btnLangEn'),
  btnLangBn: document.getElementById('btnLangBn'),
  btnThemeToggle: document.getElementById('btnThemeToggle'),
  btnLoadReq: document.getElementById('btnLoadReq'),
  btnHeaderDownload: document.getElementById('btnHeaderDownload'),
  btnSettingsModal: document.getElementById('btnSettingsModal'),
  btnCloseSettingsModal: document.getElementById('btnCloseSettingsModal'),
  btnCloseSettingsModalBtn: document.getElementById('btnCloseSettingsModalBtn'),
  settingsModal: document.getElementById('settingsModal'),

  // Tender Info elements
  tenderIdVal: document.getElementById('tenderIdVal'),
  tenderTitleVal: document.getElementById('tenderTitleVal'),
  procuringEntityVal: document.getElementById('procuringEntityVal'),
  bidderVal: document.getElementById('bidderVal'),
  deadlineText: document.getElementById('deadlineText'),
  badgeLoadedStatus: document.getElementById('badgeLoadedStatus'),
  btnEditJson: document.getElementById('btnEditJson'),

  // File Tables
  uploadCountText: document.getElementById('uploadCountText'),
  reqCountText: document.getElementById('reqCountText'),
  uploadedFilesBody: document.getElementById('uploadedFilesBody'),
  requiredDocsBody: document.getElementById('requiredDocsBody'),
  noFilesMsg: document.getElementById('noFilesMsg'),
  btnTriggerUpload: document.getElementById('btnTriggerUpload'),
  btnClearFiles: document.getElementById('btnClearFiles'),
  btnSortOrder: document.getElementById('btnSortOrder'),

  // Filters & Counters
  filterCountOk: document.getElementById('filterCountOk'),
  filterCountMissing: document.getElementById('filterCountMissing'),
  filterCountExpiry: document.getElementById('filterCountExpiry'),
  filterCountOptional: document.getElementById('filterCountOptional'),

  // Readiness
  donutGauge: document.getElementById('donutGauge'),
  donutPercentText: document.getElementById('donutPercentText'),
  readinessSummaryText: document.getElementById('readinessSummaryText'),
  statTotalDocs: document.getElementById('statTotalDocs'),
  statMatched: document.getElementById('statMatched'),
  statMissing: document.getElementById('statMissing'),
  statExpired: document.getElementById('statExpired'),
  statOptional: document.getElementById('statOptional'),
  btnGeneratePackage: document.getElementById('btnGeneratePackage'),
  generateHelperText: document.getElementById('generateHelperText'),
  blockingBox: document.getElementById('blockingBox'),
  blockingReasonsList: document.getElementById('blockingReasonsList'),

  // Preview elements
  previewPageIndicator: document.getElementById('previewPageIndicator'),
  prevTenderId: document.getElementById('prevTenderId'),
  prevTenderTitle: document.getElementById('prevTenderTitle'),
  prevProcEntity: document.getElementById('prevProcEntity'),
  prevBidder: document.getElementById('prevBidder'),
  prevDeadline: document.getElementById('prevDeadline'),
  prevIncludedDocsList: document.getElementById('prevIncludedDocsList'),
  prevFooterText: document.getElementById('prevFooterText'),
  previewNavPageNum: document.getElementById('previewNavPageNum'),
  btnPrevPage: document.getElementById('btnPrevPage'),
  btnNextPage: document.getElementById('btnNextPage'),

  // Hidden File Inputs
  pdfFileInput: document.getElementById('pdfFileInput'),
  reqFileInput: document.getElementById('reqFileInput'),
  sealFileInput: document.getElementById('sealFileInput'),

  // JSON Modal
  jsonModal: document.getElementById('jsonModal'),
  jsonEditorText: document.getElementById('jsonEditorText'),
  btnCloseJsonModal: document.getElementById('btnCloseJsonModal'),
  btnCancelJson: document.getElementById('btnCancelJson'),
  btnSaveJson: document.getElementById('btnSaveJson'),

  // Bonus Controls
  btnAutoMatch: document.getElementById('btnAutoMatch'),
  btnExportCsv: document.getElementById('btnExportCsv'),
  checkIncludeIndex: document.getElementById('checkIncludeIndex'),
  btnUploadSeal: document.getElementById('btnUploadSeal'),
  sealStatusText: document.getElementById('sealStatusText'),
  btnSaveStorage: document.getElementById('btnSaveStorage'),
  btnLoadStorage: document.getElementById('btnLoadStorage'),

  dropArea: document.getElementById('dropArea')
};

// Initialize Application
async function initApp() {
  setupEventListeners();
  applyLanguage(state.lang);

  // Load default requirements.json
  try {
    const res = await fetch('./requirements.json');
    if (res.ok) {
      const data = await res.json();
      loadRequirementsData(data);
    }
  } catch (err) {
    console.warn("Could not load default requirements.json from root, using built-in defaults", err);
    loadDefaultRequirements();
  }
}

function loadDefaultRequirements() {
  const defaultData = {
    tender: {
      tender_id: "T-2026-0417",
      title: "Supply of IT Equipment",
      procuring_entity: "Example Directorate",
      bidder: "Example Company Ltd.",
      submission_deadline: "2026-10-20"
    },
    requirements: [
      { id: "R01", order: 1, title_en: "Trade License", title_bn: "ট্রেড লাইসেন্স", mandatory: true, has_expiry: true },
      { id: "R02", order: 2, title_en: "TIN Certificate", title_bn: "টিআইএন সনদ", mandatory: true, has_expiry: false },
      { id: "R03", order: 3, title_en: "VAT Certificate", title_bn: "ভ্যাট সনদ", mandatory: true, has_expiry: true },
      { id: "R04", order: 4, title_en: "Bank Solvency Letter", title_bn: "ব্যাংক সলভেন্সি পত্র", mandatory: true, has_expiry: true },
      { id: "R05", order: 5, title_en: "Experience Certificate", title_bn: "অভিজ্ঞতার সনদ", mandatory: false, has_expiry: false },
      { id: "R06", order: 6, title_en: "Technical Proposal", title_bn: "প্রযুক্তিগত প্রস্তাব", mandatory: true, has_expiry: false },
      { id: "R07", order: 7, title_en: "Financial Proposal", title_bn: "আর্থিক প্রস্তাব", mandatory: true, has_expiry: false }
    ]
  };
  loadRequirementsData(defaultData);
}

function loadRequirementsData(data) {
  if (data.tender) {
    state.tender = { ...state.tender, ...data.tender };
  }
  if (Array.isArray(data.requirements)) {
    state.requirements = [...data.requirements].sort((a, b) => a.order - b.order);
  }
  renderTenderMetadata();
  recalculateStatuses();
  renderRequiredDocs();
  updateReadinessAndPreview();
}

// Language Handling
function applyLanguage(lang) {
  state.lang = lang;
  const t = translations[lang];

  document.body.classList.toggle('lang-bn', lang === 'bn');
  elements.btnLangEn.classList.toggle('active', lang === 'en');
  elements.btnLangBn.classList.toggle('active', lang === 'bn');

  // Update all data-i18n attributes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const value = getTranslationVal(t, key);
    if (value) {
      if (el.tagName === 'INPUT' && el.type === 'button') {
        el.value = value;
      } else {
        el.innerHTML = value.replace(/\n/g, '<br>');
      }
    }
  });

  renderTenderMetadata();
  renderRequiredDocs();
  renderUploadedFiles();
  updateReadinessAndPreview();
}

function getTranslationVal(obj, path) {
  const parts = path.split('.');
  let curr = obj;
  for (const p of parts) {
    if (!curr || curr[p] === undefined) return null;
    curr = curr[p];
  }
  return curr;
}

// Render Tender Header Details
function renderTenderMetadata() {
  elements.tenderIdVal.textContent = state.tender.tender_id || 'N/A';
  elements.tenderTitleVal.textContent = state.tender.title || 'N/A';
  elements.procuringEntityVal.textContent = state.tender.procuring_entity || 'N/A';
  elements.bidderVal.textContent = state.tender.bidder || 'N/A';
  elements.deadlineText.textContent = state.tender.submission_deadline || 'N/A';

  // Preview Card Header
  elements.prevTenderId.textContent = state.tender.tender_id || 'N/A';
  elements.prevTenderTitle.textContent = state.tender.title || 'N/A';
  elements.prevProcEntity.textContent = state.tender.procuring_entity || 'N/A';
  elements.prevBidder.textContent = state.tender.bidder || 'N/A';
  elements.prevDeadline.textContent = state.tender.submission_deadline || 'N/A';
}

// -------------------------------------------------------------
// FILE UPLOAD & DUPLICATE DETECTION (SHA-256)
// -------------------------------------------------------------
async function handleFilesUpload(fileList) {
  const files = Array.from(fileList);
  const t = translations[state.lang];

  if (state.uploadedFiles.length + files.length > 30) {
    alert(t.messages.maxFilesExceeded);
    return;
  }

  for (const file of files) {
    // 1. Validation: Reject non-PDF (check extension, MIME, %PDF header)
    const headerCheck = await validatePDFHeader(file);
    if (!headerCheck.valid) {
      alert(t.messages.nonPdfRejected.replace('{name}', file.name));
      continue;
    }

    const arrayBuffer = await file.arrayBuffer();
    const sha256 = await calculateSHA256(arrayBuffer);
    const pdfInfo = await inspectPDFFile(arrayBuffer);

    if (!pdfInfo.valid) {
      if (pdfInfo.isEncrypted) {
        alert(t.messages.passwordProtected.replace('{name}', file.name));
      } else {
        alert(t.messages.damagedFile.replace('{name}', file.name));
      }
      continue;
    }

    const fileId = 'file_' + Math.random().toString(36).substring(2, 9);
    state.uploadedFiles.push({
      id: fileId,
      name: file.name,
      size: file.size,
      pageCount: pdfInfo.pageCount,
      arrayBuffer,
      sha256,
      isDuplicate: false,
      duplicateGroup: null
    });
  }

  recalculateDuplicates();
  renderUploadedFiles();
  renderRequiredDocs();
  recalculateStatuses();
  updateReadinessAndPreview();
}

function recalculateDuplicates() {
  const hashMap = {};
  state.uploadedFiles.forEach(f => {
    if (!hashMap[f.sha256]) hashMap[f.sha256] = [];
    hashMap[f.sha256].push(f);
  });

  for (const hash in hashMap) {
    const list = hashMap[hash];
    const isDup = list.length > 1;
    list.forEach(f => {
      f.isDuplicate = isDup;
      f.duplicateGroup = isDup ? list.length : null;
    });
  }
}

function removeUploadedFile(fileId) {
  state.uploadedFiles = state.uploadedFiles.filter(f => f.id !== fileId);
  // Unmatch any document mapped to this file
  for (const docId in state.matches) {
    if (state.matches[docId] === fileId) {
      delete state.matches[docId];
    }
  }
  recalculateDuplicates();
  renderUploadedFiles();
  recalculateStatuses();
  renderRequiredDocs();
  updateReadinessAndPreview();
}

// -------------------------------------------------------------
// STATUS RULES ENGINE (Problem Statement Section 5)
// -------------------------------------------------------------
function recalculateStatuses() {
  const t = translations[state.lang];
  state.blockingReasons = [];
  const deadlineStr = (state.tender.submission_deadline || '').trim();

  state.requirements.forEach(req => {
    const matchedFileId = state.matches[req.id];
    const matchedFile = state.uploadedFiles.find(f => f.id === matchedFileId);
    const hasExpiry = Boolean(req.has_expiry);
    const expiryDateStr = (state.expiryDates[req.id] || '').trim();

    let status = 'Missing';
    const docTitle = state.lang === 'bn' ? (req.title_bn || req.title_en) : (req.title_en || req.title_bn);

    if (!matchedFile) {
      if (req.mandatory) {
        status = 'Missing';
        state.blockingReasons.push(`${docTitle}: Mandatory document is missing a matched file.`);
      } else {
        status = 'Not provided';
      }
    } else {
      if (hasExpiry) {
        if (!expiryDateStr) {
          status = 'Expiry date needed';
          state.blockingReasons.push(`${docTitle}: Expiry date must be provided.`);
        } else {
          // Compare as YYYY-MM-DD strings (Problem Statement §5: same-day expiry = OK)
          if (expiryDateStr < deadlineStr) {
            status = 'Expired';
            state.blockingReasons.push(`${docTitle}: Expired on ${expiryDateStr} (Submission deadline is ${deadlineStr}).`);
          } else {
            status = 'OK';
          }
        }
      } else {
        status = 'OK';
      }
    }

    state.statuses[req.id] = status;
  });
}

// -------------------------------------------------------------
// RENDERING TABLES
// -------------------------------------------------------------
function renderUploadedFiles() {
  elements.uploadCountText.textContent = `(${state.uploadedFiles.length} files)`;
  elements.noFilesMsg.style.display = state.uploadedFiles.length === 0 ? 'block' : 'none';
  elements.uploadedFilesBody.innerHTML = '';

  state.uploadedFiles.forEach(file => {
    const tr = document.createElement('tr');

    const formattedSize = file.size > 1024 * 1024
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      : Math.round(file.size / 1024) + ' KB';

    const duplicateBadge = file.isDuplicate
      ? `<span class="badge duplicate">Duplicate (${file.duplicateGroup})</span>`
      : `<span class="badge unique">Unique</span>`;

    tr.innerHTML = `
      <td>
        <div class="file-row-name" title="${file.name}">
          <svg class="pdf-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          ${file.name}
        </div>
      </td>
      <td>${file.pageCount}</td>
      <td>${formattedSize}</td>
      <td>${duplicateBadge}</td>
      <td>
        <div class="row-actions">
          <button class="action-icon-btn danger btn-remove-file" data-id="${file.id}" title="Remove file">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;
    elements.uploadedFilesBody.appendChild(tr);
  });

  // Attach delete button events
  elements.uploadedFilesBody.querySelectorAll('.btn-remove-file').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      removeUploadedFile(id);
    });
  });
}

function renderRequiredDocs() {
  elements.reqCountText.textContent = `(${state.requirements.length})`;
  elements.requiredDocsBody.innerHTML = '';
  const t = translations[state.lang];

  // Get list of already assigned file IDs
  const assignedFileIds = Object.values(state.matches);

  state.requirements.forEach(req => {
    const tr = document.createElement('tr');
    const matchedFileId = state.matches[req.id];
    const expiryVal = state.expiryDates[req.id] || '';
    const statusKey = state.statuses[req.id] || 'Missing';

    // Status Badge UI
    let statusBadgeHtml = '';
    if (statusKey === 'OK') {
      statusBadgeHtml = `<span class="badge status-ok">✓ ${t.statuses.ok}</span>`;
    } else if (statusKey === 'Missing') {
      statusBadgeHtml = `<span class="badge status-missing">! ${t.statuses.missing}</span>`;
    } else if (statusKey === 'Expiry date needed') {
      statusBadgeHtml = `<span class="badge status-expiry">! ${t.statuses.expiryNeeded}</span>`;
    } else if (statusKey === 'Expired') {
      statusBadgeHtml = `<span class="badge status-expired">! ${t.statuses.expired}</span>`;
    } else {
      statusBadgeHtml = `<span class="badge status-optional">ℹ ${t.statuses.notProvided}</span>`;
    }

    // Build File Select Options (Enforce 1 file per doc, 1 doc per file, no duplicate file across docs)
    let optionsHtml = `<option value="">${t.requiredDocs.selectFile}</option>`;
    state.uploadedFiles.forEach(f => {
      // Allow if it's currently selected for this doc OR not assigned to any other doc
      const isCurrentSelection = (f.id === matchedFileId);
      const isAssignedElsewhere = assignedFileIds.includes(f.id) && !isCurrentSelection;

      if (!isAssignedElsewhere) {
        optionsHtml += `<option value="${f.id}" ${isCurrentSelection ? 'selected' : ''}>${f.name}</option>`;
      }
    });

    const undoBtnHtml = matchedFileId
      ? `<button class="action-icon-btn btn-undo-match" data-doc="${req.id}" title="${t.requiredDocs.undo}">↺</button>`
      : '';

    const expiryInputHtml = req.has_expiry
      ? `<input type="date" class="date-input doc-expiry-input" data-doc="${req.id}" value="${expiryVal}" ${!matchedFileId ? 'disabled' : ''}>`
      : `<span style="color: var(--text-light); text-align: center; display: block;">—</span>`;

    tr.innerHTML = `
      <td><strong>${req.order}</strong></td>
      <td>
        <div class="doc-title-cell">
          <span class="doc-en">${req.title_en || 'Document'}</span>
          <span class="doc-bn">(${req.title_bn || ''})</span>
        </div>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 6px;">
          <select class="select-file doc-match-select" data-doc="${req.id}">
            ${optionsHtml}
          </select>
          ${undoBtnHtml}
        </div>
      </td>
      <td>${expiryInputHtml}</td>
      <td>${statusBadgeHtml}</td>
    `;

    elements.requiredDocsBody.appendChild(tr);
  });

  // Attach match select events
  elements.requiredDocsBody.querySelectorAll('.doc-match-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const docId = sel.getAttribute('data-doc');
      const fileId = e.target.value;
      if (fileId) {
        state.matches[docId] = fileId;
      } else {
        delete state.matches[docId];
      }
      recalculateStatuses();
      renderRequiredDocs();
      updateReadinessAndPreview();
    });
  });

  // Attach undo button events
  elements.requiredDocsBody.querySelectorAll('.btn-undo-match').forEach(btn => {
    btn.addEventListener('click', () => {
      const docId = btn.getAttribute('data-doc');
      delete state.matches[docId];
      recalculateStatuses();
      renderRequiredDocs();
      updateReadinessAndPreview();
    });
  });

  // Attach expiry date inputs
  elements.requiredDocsBody.querySelectorAll('.doc-expiry-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const docId = input.getAttribute('data-doc');
      state.expiryDates[docId] = e.target.value;
      recalculateStatuses();
      renderRequiredDocs();
      updateReadinessAndPreview();
    });
  });
}

// -------------------------------------------------------------
// READINESS GAUGE & LIVE PREVIEW UPDATE
// -------------------------------------------------------------
function updateReadinessAndPreview() {
  const t = translations[state.lang];
  let okCount = 0;
  let missingCount = 0;
  let expiryCount = 0;
  let expiredCount = 0;
  let optNotProvidedCount = 0;
  let totalMandatory = 0;

  state.requirements.forEach(req => {
    const st = state.statuses[req.id];
    if (req.mandatory) totalMandatory++;

    if (st === 'OK') okCount++;
    else if (st === 'Missing') missingCount++;
    else if (st === 'Expiry date needed') expiryCount++;
    else if (st === 'Expired') expiredCount++;
    else if (st === 'Not provided') optNotProvidedCount++;
  });

  // Header Filter Counters
  elements.filterCountOk.textContent = `✓ ${t.statusFilter.ok} ${okCount}`;
  elements.filterCountMissing.textContent = `! ${t.statusFilter.missing} ${missingCount}`;
  elements.filterCountExpiry.textContent = `! ${t.statusFilter.expiry} ${expiryCount}`;
  elements.filterCountOptional.textContent = `ℹ ${t.statusFilter.optional} ${optNotProvidedCount}`;

  // Gauge Percentage
  const mandatoryReadyCount = state.requirements.filter(r => r.mandatory && state.statuses[r.id] === 'OK').length;
  const pct = totalMandatory > 0 ? Math.round((mandatoryReadyCount / totalMandatory) * 100) : 0;

  elements.donutGauge.style.setProperty('--percent', pct);
  elements.donutPercentText.textContent = `${pct}%`;
  elements.readinessSummaryText.textContent = t.readiness.readySummary
    .replace('{ready}', mandatoryReadyCount)
    .replace('{total}', totalMandatory);

  elements.statTotalDocs.textContent = state.requirements.length;
  elements.statMatched.textContent = Object.keys(state.matches).length;
  elements.statMissing.textContent = missingCount;
  elements.statExpired.textContent = expiredCount + expiryCount;
  elements.statOptional.textContent = optNotProvidedCount;

  // Blocking issues check
  const isBlocked = state.blockingReasons.length > 0;

  if (isBlocked) {
    elements.btnGeneratePackage.className = 'btn-generate-package disabled';
    elements.generateHelperText.textContent = t.readiness.fixIssues;
    elements.blockingBox.style.display = 'block';
    elements.blockingReasonsList.innerHTML = state.blockingReasons.map(r => `<li>${r}</li>`).join('');
  } else {
    elements.btnGeneratePackage.className = 'btn-generate-package enabled';
    elements.generateHelperText.textContent = t.readiness.allPassed;
    elements.blockingBox.style.display = 'none';
  }

  // Update Live Preview Cover Information
  updateLivePreviewCover();
}

function updateLivePreviewCover() {
  const sortedIncluded = [...state.requirements]
    .sort((a, b) => a.order - b.order)
    .filter(req => Boolean(state.matches[req.id]));

  let totalPages = 1; // Cover page is 1
  if (state.includeIndexPage) totalPages += 1;

  let listHtml = '';
  sortedIncluded.forEach(req => {
    const f = state.uploadedFiles.find(file => file.id === state.matches[req.id]);
    const pCount = f ? f.pageCount : 1;
    totalPages += pCount;

    listHtml += `
      <div style="display: flex; justify-content: space-between; border-bottom: 0.5px dashed #e2e8f0; padding: 1px 0;">
        <span>${req.order}. ${req.title_en}</span>
        <span style="color: #64748b;">${pCount}p</span>
      </div>
    `;
  });

  elements.prevIncludedDocsList.innerHTML = listHtml || '<div style="color: #94a3b8; font-style: italic;">No documents matched yet</div>';
  elements.previewPageIndicator.textContent = `Page 1 of ${totalPages}`;
  elements.prevFooterText.textContent = `${state.tender.tender_id || 'TENDER'} | Page 1 of ${totalPages}`;
  elements.previewNavPageNum.textContent = `1 / ${totalPages}`;
}

// -------------------------------------------------------------
// PACKAGE GENERATION & DOWNLOAD
// -------------------------------------------------------------
async function handleGeneratePackage() {
  if (state.blockingReasons.length > 0) {
    alert("Cannot generate package: Blocking issues exist!\n\n" + state.blockingReasons.join('\n'));
    return;
  }

  elements.btnGeneratePackage.disabled = true;
  elements.btnGeneratePackage.innerHTML = `<span>⏳ Generating Package...</span>`;

  try {
    const matchedFilesMap = {};
    for (const docId in state.matches) {
      const fileId = state.matches[docId];
      matchedFilesMap[docId] = state.uploadedFiles.find(f => f.id === fileId);
    }

    const result = await buildTenderPackage({
      tender: state.tender,
      requirements: state.requirements,
      matchedFilesMap,
      includeIndexPage: state.includeIndexPage,
      sealImageBuffer: state.sealImageBuffer
    });

    state.generatedBlob = result.blob;
    triggerDownload(result.blob, `${state.tender.tender_id || 'Tender'}_Package.pdf`);

    alert(translations[state.lang].messages.packageReady);
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert("PDF generation failed: " + err.message);
  } finally {
    elements.btnGeneratePackage.disabled = false;
    elements.btnGeneratePackage.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
      </svg>
      <span>${translations[state.lang].readiness.generateBtn}</span>
    `;
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// -------------------------------------------------------------
// BONUS: AUTO-MATCHING BY FILENAME
// -------------------------------------------------------------
function runAutoMatch() {
  let matchCount = 0;
  const assignedFileIds = new Set(Object.values(state.matches));

  state.requirements.forEach(req => {
    if (state.matches[req.id]) return; // already matched

    const enWords = (req.title_en || '').toLowerCase().split(/[\s_-]+/);

    for (const f of state.uploadedFiles) {
      if (assignedFileIds.has(f.id)) continue;
      const fNameLower = f.name.toLowerCase();

      // Check if key words match filename
      const matchScore = enWords.filter(w => w.length > 2 && fNameLower.includes(w)).length;
      if (matchScore >= 1) {
        state.matches[req.id] = f.id;
        assignedFileIds.add(f.id);
        matchCount++;
        break;
      }
    }
  });

  recalculateStatuses();
  renderRequiredDocs();
  updateReadinessAndPreview();
  alert(`Auto-match complete: ${matchCount} documents successfully matched!`);
}

// -------------------------------------------------------------
// EVENT LISTENERS SETUP
// -------------------------------------------------------------
function setupEventListeners() {
  // Language Switch
  elements.btnLangEn.addEventListener('click', () => applyLanguage('en'));
  elements.btnLangBn.addEventListener('click', () => applyLanguage('bn'));

  // Theme Toggle
  elements.btnThemeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
  });

  // Load requirements button
  elements.btnLoadReq.addEventListener('click', () => elements.reqFileInput.click());
  elements.reqFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        loadRequirementsData(json);
      } catch (err) {
        alert("Invalid requirements.json file: " + err.message);
      }
    }
  });

  // Upload PDFs triggers
  elements.btnTriggerUpload.addEventListener('click', () => elements.pdfFileInput.click());
  elements.pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFilesUpload(e.target.files);
    }
  });

  // Drag and Drop
  elements.dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  elements.dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  });

  // Clear all uploaded files
  elements.btnClearFiles.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear all uploaded files?")) {
      state.uploadedFiles = [];
      state.matches = {};
      renderUploadedFiles();
      recalculateStatuses();
      renderRequiredDocs();
      updateReadinessAndPreview();
    }
  });

  // Sort by order
  elements.btnSortOrder.addEventListener('click', () => {
    state.requirements.sort((a, b) => a.order - b.order);
    renderRequiredDocs();
  });

  // Generate & Download buttons
  elements.btnGeneratePackage.addEventListener('click', handleGeneratePackage);
  elements.btnHeaderDownload.addEventListener('click', handleGeneratePackage);

  // JSON Modal
  elements.btnEditJson.addEventListener('click', () => {
    const fullData = { tender: state.tender, requirements: state.requirements };
    elements.jsonEditorText.value = JSON.stringify(fullData, null, 2);
    elements.jsonModal.classList.add('open');
  });
  elements.btnCloseJsonModal.addEventListener('click', () => elements.jsonModal.classList.remove('open'));
  elements.btnCancelJson.addEventListener('click', () => elements.jsonModal.classList.remove('open'));
  elements.btnSaveJson.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(elements.jsonEditorText.value);
      loadRequirementsData(parsed);
      elements.jsonModal.classList.remove('open');
    } catch (err) {
      alert("Invalid JSON: " + err.message);
    }
  });

  // Settings & Bonus Modal
  elements.btnSettingsModal.addEventListener('click', () => elements.settingsModal.classList.add('open'));
  elements.btnCloseSettingsModal.addEventListener('click', () => elements.settingsModal.classList.remove('open'));
  elements.btnCloseSettingsModalBtn.addEventListener('click', () => elements.settingsModal.classList.remove('open'));

  // Bonus: Auto Match
  elements.btnAutoMatch.addEventListener('click', runAutoMatch);

  // Bonus: CSV Export
  elements.btnExportCsv.addEventListener('click', () => {
    const matchedFilesMap = {};
    for (const docId in state.matches) {
      matchedFilesMap[docId] = state.uploadedFiles.find(f => f.id === state.matches[docId]);
    }
    const blob = exportChecklistCSV({
      tender: state.tender,
      requirements: state.requirements,
      matchedFilesMap,
      statuses: state.statuses,
      expiryDates: state.expiryDates
    });
    triggerDownload(blob, `${state.tender.tender_id || 'Tender'}_Checklist.csv`);
  });

  // Bonus: Table of Contents / Index Checkbox
  elements.checkIncludeIndex.addEventListener('change', (e) => {
    state.includeIndexPage = e.target.checked;
    updateReadinessAndPreview();
  });

  // Bonus: Seal Upload
  elements.btnUploadSeal.addEventListener('click', () => elements.sealFileInput.click());
  elements.sealFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      state.sealImageBuffer = await file.arrayBuffer();
      elements.sealStatusText.textContent = `Attached: ${file.name}`;
    }
  });

  // Bonus: LocalStorage Save / Restore
  elements.btnSaveStorage.addEventListener('click', () => {
    const savedPayload = {
      tender: state.tender,
      requirements: state.requirements,
      matches: state.matches,
      expiryDates: state.expiryDates
    };
    localStorage.setItem('tenderdoc_builder_state', JSON.stringify(savedPayload));
    alert(translations[state.lang].messages.savedSuccess);
  });

  elements.btnLoadStorage.addEventListener('click', () => {
    const raw = localStorage.getItem('tenderdoc_builder_state');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.tender) state.tender = parsed.tender;
        if (parsed.requirements) state.requirements = parsed.requirements;
        if (parsed.matches) state.matches = parsed.matches;
        if (parsed.expiryDates) state.expiryDates = parsed.expiryDates;
        renderTenderMetadata();
        recalculateStatuses();
        renderRequiredDocs();
        updateReadinessAndPreview();
        alert("Restored progress from LocalStorage.");
      } catch (e) {
        alert("Could not load from storage: " + e.message);
      }
    } else {
      alert("No saved progress found in LocalStorage.");
    }
  });
}

// Start app
initApp();
