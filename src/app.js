import { translations } from './i18n.js';
import {
  calculateSHA256,
  validatePDFHeader,
  inspectPDFFile,
  buildTenderPackage,
  exportChecklistCSV
} from './pdf-builder.js';

// SVG Icon Paths Map
const paths = {
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
  upload: 'M12 16V3 M7 8l5-5 5 5 M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5',
  check: 'M20 6L9 17l-5-5',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  calendar: 'M8 2v4 M16 2v4 M3 9h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
  building: 'M4 21V5h11v16 M15 9h5v12 M2 21h20 M7 8h1 M11 8h1 M7 12h1 M11 12h1 M7 16h1 M11 16h1',
  clock: 'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  folder: 'M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  info: 'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  alert: 'M12 9v4 M12 17h.01 M10 3L2 18a2 2 0 0 0 2 3h16a2 2 0 0 0 2-3L14 3a2 2 0 0 0-4 0',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  sun: 'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M21 13A9 9 0 0 1 11 3 9 9 0 1 0 21 13',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  close: 'M6 6l12 12 M6 18L18 6',
  print: 'M6 9V3h12v6 M6 17H3V9h18v8h-3 M6 14h12v7H6z',
  edit: 'M16 3l5 5 M3 21l5-1L21 7a2 2 0 0 0-4-4L4 16z',
  plus: 'M12 5v14 M5 12h14',
  refresh: 'M20 7V3l-4 1 M20 7A9 9 0 1 0 21 15',
  list: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  chevron: 'M9 5l7 7-7 7',
  lock: 'M7 11V7a5 5 0 0 1 10 0v4 M5 11h14v10H5z',
  code: 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 3l-4 18'
};

function icon(name, cl = '') {
  return `<svg class="icon ${cl}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.file}"/></svg>`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Five Core Routes Specification
const ROUTES = [
  { id: 'tender-details', num: '01' },
  { id: 'upload-documents', num: '02' },
  { id: 'match-check', num: '03' },
  { id: 'preview', num: '04' },
  { id: 'generate', num: '05' }
];

// Application State
const state = {
  lang: sessionStorage.getItem('td-lang') || 'en',
  theme: sessionStorage.getItem('td-theme') || 'light',
  tender: null,
  requirements: [],
  uploadedFiles: [], // Array of { id, name, size, pageCount, arrayBuffer, uint8Array, sha256, isDuplicate, duplicateGroup, isEncrypted, isDamaged }
  matches: {}, // docId -> fileId
  expiryDates: {}, // docId -> YYYY-MM-DD
  statuses: {}, // docId -> OK | Missing | Expiry date needed | Expired | Not provided
  blockingReasons: [],
  filter: 'all', // all | valid | missing | expired
  isGenerating: false,
  generatedPdfBytes: null,
  includeIndexPage: false,
  sealImageBuffer: null,
  sealFileName: null,
  sealPreviewUrl: null
};

// Translation Helper
function t(key) {
  const dict = translations[state.lang] || translations.en;
  const parts = key.split('.');
  let cur = dict;
  for (const p of parts) {
    if (!cur || cur[p] === undefined) {
      // fallback to English
      let fallback = translations.en;
      for (const fp of parts) {
        if (!fallback || fallback[fp] === undefined) return key;
        fallback = fallback[fp];
      }
      return fallback;
    }
    cur = cur[p];
  }
  return cur;
}

// Router Mechanics
function currentRoute() {
  const p = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  const match = ROUTES.find(r => r.id === p);
  return match ? match.id : 'tender-details';
}

function currentIndex() {
  return ROUTES.findIndex(r => r.id === currentRoute());
}

function navigate(routeId) {
  const target = ROUTES.some(r => r.id === routeId) ? routeId : 'tender-details';
  window.history.pushState(null, '', `/${target}`);
  render();
}

window.addEventListener('popstate', () => {
  render();
});

// Toast Notifications
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// Format Utilities
function formatDate(dStr) {
  if (!dStr) return '—';
  try {
    const d = new Date(dStr + 'T12:00:00');
    return d.toLocaleDateString(state.lang === 'bn' ? 'bn-BD' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dStr;
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
  return Math.round(bytes / 1024) + ' KB';
}

// Status Recalculation Engine
function recalculateStatuses() {
  state.blockingReasons = [];
  state.statuses = {};

  if (!state.tender || !state.tender.submission_deadline) {
    state.blockingReasons.push(state.lang === 'bn' ? 'কোনো টেন্ডার লোড করা হয়নি' : 'No requirements.json loaded yet.');
  }

  const deadline = state.tender?.submission_deadline || '';

  // 1. Requirement statuses & expiry checks
  state.requirements.forEach(req => {
    const fileId = state.matches[req.id];
    const docTitle = state.lang === 'bn' ? (req.title_bn || req.title_en || req.name) : (req.title_en || req.name || req.id);
    const isMandatory = req.mandatory !== false;
    const hasExpiry = Boolean(req.has_expiry || req.requires_expiry || req.expiryRequired);

    if (!fileId) {
      if (isMandatory) {
        state.statuses[req.id] = 'Missing';
        state.blockingReasons.push(`${docTitle}: ${state.lang === 'bn' ? 'আবশ্যক ডকুমেন্টটিতে কোনো ফাইল যুক্ত করা হয়নি।' : 'Mandatory document is missing a matched file.'}`);
      } else {
        state.statuses[req.id] = 'Not provided';
      }
      return;
    }

    const matchedFile = state.uploadedFiles.find(f => f.id === fileId);
    if (!matchedFile) {
      if (isMandatory) {
        state.statuses[req.id] = 'Missing';
        state.blockingReasons.push(`${docTitle}: ${state.lang === 'bn' ? 'সংযুক্ত ফাইলটি অনুপস্থিত।' : 'Assigned file not found in uploads.'}`);
      } else {
        state.statuses[req.id] = 'Not provided';
      }
      return;
    }

    if (hasExpiry) {
      const expDate = state.expiryDates[req.id];
      if (!expDate) {
        state.statuses[req.id] = 'Expiry date needed';
        state.blockingReasons.push(`${docTitle}: ${state.lang === 'bn' ? 'মেয়াদোত্তীর্ণের তারিখ প্রদান করতে হবে।' : 'Expiry date must be provided.'}`);
      } else if (deadline && expDate < deadline) {
        state.statuses[req.id] = 'Expired';
        state.blockingReasons.push(`${docTitle}: ${state.lang === 'bn' ? `মেয়াদ শেষ (${expDate})। জমার তারিখ: ${deadline}` : `Expired on ${expDate} (Submission deadline is ${deadline}).`}`);
      } else {
        state.statuses[req.id] = 'OK';
      }
    } else {
      state.statuses[req.id] = 'OK';
    }
  });

  // 2. Duplicate Detection Checks (File reuse across multiple requirements or identical SHA-256)
  const usedFileIds = {};
  const usedHashes = {};

  state.requirements.forEach(req => {
    const fileId = state.matches[req.id];
    if (!fileId) return;
    const f = state.uploadedFiles.find(x => x.id === fileId);
    if (!f) return;

    const docTitle = state.lang === 'bn' ? (req.title_bn || req.title_en || req.name) : (req.title_en || req.name || req.id);

    if (usedFileIds[fileId]) {
      const otherTitle = usedFileIds[fileId];
      state.blockingReasons.push(
        state.lang === 'bn'
          ? `ফাইল পুনর্ব্যবহার: '${f.name}' ফাইলটি '${otherTitle}' এবং '${docTitle}' উভয় স্থানে অ্যাসাইন করা হয়েছে।`
          : `Duplicate assignment: '${f.name}' is matched to both '${otherTitle}' and '${docTitle}'.`
      );
    } else {
      usedFileIds[fileId] = docTitle;
    }

    if (f.sha256) {
      if (usedHashes[f.sha256] && usedHashes[f.sha256].fileId !== fileId) {
        const otherTitle = usedHashes[f.sha256].docTitle;
        state.blockingReasons.push(
          state.lang === 'bn'
            ? `ডুপ্লিকেট কনটেন্ট: '${docTitle}' এবং '${otherTitle}' এর ফাইলের বাইনারি কনটেন্ট (SHA-256) হুবহু এক।`
            : `Duplicate file content detected between '${docTitle}' and '${otherTitle}' (identical SHA-256).`
        );
      } else {
        usedHashes[f.sha256] = { docTitle, fileId };
      }
    }
  });

  // Mark files with duplicate flags in state.uploadedFiles
  const hashCount = {};
  state.uploadedFiles.forEach(f => {
    if (f.sha256) {
      hashCount[f.sha256] = (hashCount[f.sha256] || 0) + 1;
    }
  });
  state.uploadedFiles.forEach(f => {
    f.isDuplicate = Boolean(f.sha256 && hashCount[f.sha256] > 1);
  });
}

function getCounts() {
  const mandatory = state.requirements.filter(r => r.mandatory !== false);
  const total = mandatory.length;
  const valid = mandatory.filter(r => state.statuses[r.id] === 'OK').length;
  const missing = mandatory.filter(r => state.statuses[r.id] === 'Missing').length;
  const expired = mandatory.filter(r => state.statuses[r.id] === 'Expired' || state.statuses[r.id] === 'Expiry date needed').length;
  const optional = state.requirements.filter(r => r.mandatory === false && !state.matches[r.id]).length;
  const pct = total > 0 ? Math.round((valid / total) * 100) : 0;
  return { total, valid, missing, expired, optional, pct };
}

// Normalize incoming requirements JSON structure
function normalizeRequirements(raw) {
  const tenderSrc = raw.tender || raw;
  const reqSrc = raw.requirements || raw.required_documents || [];

  if (!Array.isArray(reqSrc) || reqSrc.length === 0) {
    throw new Error('Requirements JSON must contain an array of requirements.');
  }

  const tender = {
    tender_id: tenderSrc.tender_id || tenderSrc.id || 'Untitled',
    title: tenderSrc.title || tenderSrc.tender_title || 'Tender Package',
    procuring_entity: tenderSrc.procuring_entity || '—',
    bidder: tenderSrc.bidder || '—',
    submission_deadline: tenderSrc.submission_deadline || tenderSrc.deadline || ''
  };

  const requirements = reqSrc.map((r, idx) => {
    return {
      id: String(r.id || 'R' + String(idx + 1).padStart(2, '0')),
      order: Number(r.order !== undefined ? r.order : idx + 1),
      title_en: r.title_en || r.name || r.title || r.document_name || `Document ${idx + 1}`,
      title_bn: r.title_bn || r.document_name_bn || r.title_en || r.name || '',
      mandatory: r.mandatory !== undefined ? Boolean(r.mandatory) : (r.required !== undefined ? Boolean(r.required) : true),
      has_expiry: Boolean(r.has_expiry || r.requires_expiry || r.expiryRequired || r.expiry_required),
      keywords: Array.isArray(r.keywords) ? r.keywords : []
    };
  }).sort((a, b) => a.order - b.order);

  return { tender, requirements };
}

// Auto-match uploaded files to requirements
function autoMatch() {
  let matchCount = 0;
  state.requirements.forEach(req => {
    if (state.matches[req.id]) return; // already assigned

    const titleEn = (req.title_en || req.name || '').toLowerCase();
    const cleanWords = titleEn.split(/[\s_\-]+/).filter(w => w.length > 3);
    const keywords = [...(req.keywords || []), ...cleanWords].map(k => k.toLowerCase());

    const found = state.uploadedFiles.find(f => {
      // Don't auto-assign a file already matched elsewhere
      if (Object.values(state.matches).includes(f.id)) return false;
      const fn = f.name.toLowerCase();
      return keywords.some(k => fn.includes(k));
    });

    if (found) {
      state.matches[req.id] = found.id;
      matchCount++;
    }
  });

  recalculateStatuses();
  render();
  toast(state.lang === 'bn' ? `${matchCount}টি ফাইল স্বয়ংক্রিয়ভাবে ম্যাচ হয়েছে।` : `${matchCount} files automatically matched.`);
}

// Read File as Data URL (Helper for seal image preview)
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Seal Upload Handler
async function handleSealUpload(file) {
  try {
    const buffer = await file.arrayBuffer();
    const header = new Uint8Array(buffer.slice(0, 8));
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
    if (!isPng) {
      toast(state.lang === 'bn' ? `'${file.name}' বাতিল: এটি বৈধ PNG ইমেজ নয়।` : `Rejected '${file.name}': Not a valid PNG image.`);
      return false;
    }

    state.sealImageBuffer = buffer;
    state.sealFileName = file.name;
    state.sealPreviewUrl = await readFileAsDataURL(file);
    render();
    toast(t('messages.sealUploaded'));
    return true;
  } catch (err) {
    console.error('Failed to process seal PNG:', err);
    toast(state.lang === 'bn' ? 'সিল ফাইলটি পড়া সম্ভব হয়নি।' : 'Could not read seal image.');
    return false;
  }
}

// Remove Seal Handler
function removeSeal() {
  state.sealImageBuffer = null;
  state.sealFileName = null;
  state.sealPreviewUrl = null;
  render();
  toast(t('messages.sealRemoved'));
}

// File Ingestion Handler
async function handleFilesUpload(filesList) {
  let accepted = 0;
  let rejected = 0;
  let sealProcessed = false;

  for (const file of Array.from(filesList)) {
    // Check if uploaded file is a PNG seal/stamp image
    if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
      const ok = await handleSealUpload(file);
      if (ok) sealProcessed = true;
      continue;
    }

    // 1. Header & Extension Validation
    const headerCheck = await validatePDFHeader(file);
    if (!headerCheck.valid) {
      rejected++;
      toast(t('messages.nonPdfRejected').replace('{name}', file.name));
      continue;
    }

    try {
      const buffer = await file.arrayBuffer();
      const inspect = await inspectPDFFile(buffer);
      if (!inspect.valid) {
        rejected++;
        toast(t('messages.damagedFile').replace('{name}', file.name));
        continue;
      }

      const sha256 = await calculateSHA256(buffer);

      // Check if exact same file is already in uploadedFiles
      const existing = state.uploadedFiles.find(f => f.name === file.name && f.size === file.size);
      if (existing) {
        continue;
      }

      const fileObj = {
        id: 'f_' + crypto.randomUUID(),
        name: file.name,
        size: file.size,
        pageCount: inspect.pageCount,
        arrayBuffer: buffer,
        uint8Array: new Uint8Array(buffer),
        sha256,
        isEncrypted: inspect.isEncrypted
      };

      state.uploadedFiles.push(fileObj);
      accepted++;
    } catch (err) {
      rejected++;
      console.error(err);
      toast(t('messages.damagedFile').replace('{name}', file.name));
    }
  }

  // Attempt smart auto-matching for newly uploaded files
  if (accepted > 0) {
    autoMatch();
  } else {
    recalculateStatuses();
    render();
  }
}

// Load Requirements JSON File
async function handleRequirementsUpload(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const normalized = normalizeRequirements(parsed);

    state.tender = normalized.tender;
    state.requirements = normalized.requirements;
    state.matches = {};
    state.expiryDates = {};

    // Auto-match existing files
    autoMatch();
    toast(t('messages.jsonLoaded'));
  } catch (err) {
    alert(err.message || 'Invalid requirements.json format.');
  }
}

// Generate Package Execution
async function executePackageGeneration() {
  recalculateStatuses();
  if (state.blockingReasons.length > 0) {
    alert(
      (state.lang === 'bn' ? 'প্যাকেজ তৈরি করা সম্ভব নয়। নিচের সমস্যাগুলো সমাধান করুন:\n\n' : 'Cannot generate package. Please resolve the following blockers:\n\n') +
      state.blockingReasons.join('\n')
    );
    return;
  }

  try {
    state.isGenerating = true;
    render();

    const matchedFilesMap = {};
    state.requirements.forEach(req => {
      const fileId = state.matches[req.id];
      if (fileId) {
        const f = state.uploadedFiles.find(x => x.id === fileId);
        if (f) {
          matchedFilesMap[req.id] = {
            name: f.name,
            arrayBuffer: f.uint8Array || f.arrayBuffer
          };
        }
      }
    });

    const result = await buildTenderPackage({
      tender: state.tender,
      requirements: state.requirements,
      matchedFilesMap,
      includeIndexPage: state.includeIndexPage,
      sealImageBuffer: state.sealImageBuffer
    });

    state.generatedPdfBytes = result.pdfBytes;
    state.isGenerating = false;

    // Trigger download
    const blob = new Blob([result.pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.tender.tender_id || 'Tender'}_Package.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1000);

    render();
    toast(t('messages.packageReady'));
  } catch (err) {
    state.isGenerating = false;
    render();
    alert('Package Generation Failed: ' + (err.message || err));
  }
}

// Export CSV Action
function handleExportCSV() {
  exportChecklistCSV(
    state.tender,
    state.requirements,
    state.matches,
    state.uploadedFiles,
    state.expiryDates,
    state.statuses
  );
}

// Modal dialog builder
function showModal(title, bodyHtml, footerButtonsHtml = '') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  overlay.innerHTML = `
    <div class="modal">
      <div class="card-head">
        <h2>${title}</h2>
        <button class="icon-btn" data-close aria-label="${t('buttons.close')}">${icon('close')}</button>
      </div>
      <div style="margin-top:16px;">
        ${bodyHtml}
      </div>
      ${footerButtonsHtml ? `<div style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px;">${footerButtonsHtml}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') close();
  }

  document.addEventListener('keydown', onKeyDown);
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.closest('[data-close]')) close();
  });

  return { close, element: overlay };
}

// Modal: View JSON
function openViewJsonModal() {
  const content = {
    tender: state.tender,
    requirements: state.requirements
  };
  const jsonStr = JSON.stringify(content, null, 2);
  const body = `
    <p class="muted small">${state.lang === 'bn' ? 'বর্তমান টেন্ডার রিকোয়ারমেন্টের JSON ডেটা:' : 'Current tender requirements JSON data:'}</p>
    <pre>${esc(jsonStr)}</pre>
  `;
  const foot = `
    <button class="btn" data-close>${t('buttons.close')}</button>
    <button class="btn primary" id="btnDownloadJson">${icon('download')} ${state.lang === 'bn' ? 'JSON ডাউনলোড' : 'Download JSON'}</button>
  `;
  const m = showModal(t('tenderInfo.title'), body, foot);
  m.element.querySelector('#btnDownloadJson').onclick = () => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.tender?.tender_id || 'requirements'}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}

// Modal: Edit Bidder
function openEditBidderModal() {
  const body = `
    <form id="bidderForm">
      <label class="dialog-label">${t('tenderInfo.bidder')}</label>
      <input class="text-input" id="inputBidderName" value="${esc(state.tender?.bidder || '')}" required maxlength="120" />
      <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px;">
        <button type="button" class="btn" data-close>${t('buttons.cancel')}</button>
        <button type="submit" class="btn primary">${t('buttons.save')}</button>
      </div>
    </form>
  `;
  const m = showModal(t('buttons.editBidder'), body);
  m.element.querySelector('#bidderForm').onsubmit = e => {
    e.preventDefault();
    const val = m.element.querySelector('#inputBidderName').value.trim();
    if (state.tender) {
      state.tender.bidder = val;
    }
    m.close();
    recalculateStatuses();
    render();
    toast(t('messages.bidderSaved'));
  };
}

// Modal: Settings & Tools
function openSettingsModal() {
  const body = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;">
        <input type="checkbox" id="checkIncludeIndex" ${state.includeIndexPage ? 'checked' : ''} style="width:16px;height:16px;" />
        <span>${state.lang === 'bn' ? 'কভার পেজের পর একটি টেবিল অফ কন্টেন্টস (ইনডেক্স পেজ) যোগ করুন' : 'Include Table of Contents page after cover sheet'}</span>
      </label>
      <div style="border-top:1px solid var(--line);padding-top:14px;display:flex;flex-direction:column;gap:10px;">
        <strong style="font-size:13px;color:var(--text);">${state.lang === 'bn' ? 'টুলস ও এক্সপোর্ট:' : 'Tools & Data Export:'}</strong>
        <button class="btn" id="btnModalExportCsv">${icon('download')} ${t('generate.btnExportCsv')}</button>
        <button class="btn" id="btnModalLoadDefault">${icon('refresh')} ${state.lang === 'bn' ? 'ডিফল্ট স্যাম্পল প্যাক রিলোড করুন' : 'Reload Official Sample Pack'}</button>
      </div>
    </div>
  `;
  const foot = `<button class="btn primary" data-close>${t('buttons.close')}</button>`;
  const m = showModal(state.lang === 'bn' ? 'সেটিংস ও টুলস' : 'Settings & Tools', body, foot);

  m.element.querySelector('#checkIncludeIndex').onchange = e => {
    state.includeIndexPage = e.target.checked;
  };

  m.element.querySelector('#btnModalExportCsv').onclick = () => {
    handleExportCSV();
    m.close();
  };

  m.element.querySelector('#btnModalLoadDefault').onclick = async () => {
    try {
      const resp = await fetch('/requirements.json');
      const json = await resp.json();
      const norm = normalizeRequirements(json);
      state.tender = norm.tender;
      state.requirements = norm.requirements;
      state.matches = {};
      state.expiryDates = {};
      autoMatch();
      m.close();
      toast(t('messages.jsonLoaded'));
    } catch (err) {
      alert('Could not load sample pack: ' + err.message);
    }
  };
}

// -------------------------------------------------------------
// PAGE 1: /tender-details
// -------------------------------------------------------------
function renderTenderDetails() {
  const d = state.tender || {
    tender_id: '—',
    title: state.lang === 'bn' ? 'কোনো রিকোয়ারমেন্ট লোড করা হয়নি' : 'No requirements loaded yet',
    procuring_entity: '—',
    bidder: '—',
    submission_deadline: ''
  };

  const isLoaded = Boolean(state.tender && state.tender.tender_id && state.tender.tender_id !== '—');
  const counts = getCounts();

  const heroBadge = isLoaded
    ? `<span class="badge green">${icon('check')}${t('tenderInfo.loadedSuccess')}</span>`
    : `<span class="badge gray">${t('tenderInfo.notLoaded')}</span>`;

  return `
    <div class="page-head">
      <div>
        <h1>${t('routes.tender-details.title')}</h1>
        <p>${t('routes.tender-details.sub')}</p>
      </div>
      <button class="btn primary" data-action="load-json">
        ${icon('folder')} ${t('tenderInfo.loadBtn')}
      </button>
    </div>

    <!-- Overview Grid: Tender Hero + Readiness Gauge -->
    <div class="overview-grid">
      <section class="card tender-hero">
        <div class="hero-top">
          <span class="tender-id">${icon('file')}${esc(d.tender_id)}</span>
          ${heroBadge}
        </div>
        <h2>${esc(d.title)}</h2>
        <p class="entity">${esc(d.procuring_entity)}</p>
        <div class="hero-meta">
          <div class="meta-item">
            ${icon('calendar')}
            <div>
              <small>${t('tenderInfo.submissionDeadline')}</small>
              <strong>${formatDate(d.submission_deadline)}</strong>
            </div>
          </div>
          <div class="meta-item">
            ${icon('building')}
            <div>
              <small>${t('tenderInfo.bidder')}</small>
              <strong>${esc(d.bidder)}</strong>
            </div>
          </div>
        </div>
      </section>

      <!-- Readiness Widget -->
      <div class="card readiness">
        <h3>${t('readiness.title')}</h3>
        <div class="ring" style="--pct:${counts.pct}">
          <strong>${counts.pct}%<small>${t('complete')}</small></strong>
        </div>
        <p>${counts.valid} / ${counts.total} ${t('readiness.matchedRatio')}</p>
      </div>
    </div>

    <!-- Stats 3-Card Row -->
    <div class="stats">
      <div class="card stat">
        <div class="icon-box">${icon('list')}</div>
        <div>
          <strong>${counts.total}</strong>
          <p>${t('readiness.totalDocs')}</p>
        </div>
      </div>
      <div class="card stat">
        <div class="icon-box green">${icon('check')}</div>
        <div>
          <strong>${counts.valid}</strong>
          <p>${t('readiness.matchedDocs')}</p>
        </div>
      </div>
      <div class="card stat">
        <div class="icon-box orange">${icon('alert')}</div>
        <div>
          <strong>${counts.missing + counts.expired}</strong>
          <p>${t('readiness.needsAttention')}</p>
        </div>
      </div>
    </div>

    <!-- Two-Column Details & Sequence Checklist -->
    <div class="two-col">
      <section class="card">
        <div class="card-head">
          <div>
            <h2>${t('tenderInfo.title')}</h2>
            <p>${t('tenderInfo.sub')}</p>
          </div>
          <button class="btn text" data-action="view-json">${icon('code')} ${t('tenderInfo.editJson')}</button>
        </div>
        <div class="card-body details-grid">
          <div>
            <span class="field-label">${t('tenderInfo.tenderId')}</span>
            <div class="field-value">${esc(d.tender_id)}</div>
          </div>
          <div>
            <span class="field-label">${t('tenderInfo.submissionDeadline')}</span>
            <div class="field-value">${formatDate(d.submission_deadline)}</div>
          </div>
          <div class="field-wide">
            <span class="field-label">${t('tenderInfo.tenderTitle')}</span>
            <div class="field-value">${esc(d.title)}</div>
          </div>
          <div>
            <span class="field-label">${t('tenderInfo.procuringEntity')}</span>
            <div class="field-value">${esc(d.procuring_entity)}</div>
          </div>
          <div>
            <span class="field-label">${t('tenderInfo.bidder')}</span>
            <div class="field-value">
              ${esc(d.bidder)}
              <button class="btn text" style="margin-left:6px" data-action="edit-bidder" aria-label="${t('buttons.editBidder')}">
                ${icon('edit')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h2>${t('tenderInfo.checklistTitle')}</h2>
            <p>${state.requirements.length} ${state.lang === 'bn' ? 'টি নির্ধারিত ডকুমেন্ট' : 'documents in order'}</p>
          </div>
        </div>
        <div class="card-body" style="padding-top:10px;padding-bottom:10px">
          <ol class="sequence">
            ${state.requirements.length ? state.requirements.map((r, i) => {
              const reqTitle = state.lang === 'bn' ? (r.title_bn || r.title_en) : (r.title_en || r.name);
              const badgeClass = r.mandatory !== false ? 'gray' : 'soft';
              const badgeLabel = r.mandatory !== false ? (state.lang === 'bn' ? 'আবশ্যক' : 'Required') : (state.lang === 'bn' ? 'ঐচ্ছিক' : 'Optional');
              return `
                <li>
                  <span class="number">${i + 1}</span>
                  <span>${esc(reqTitle)}</span>
                  <span class="badge ${badgeClass}">${esc(badgeLabel)}</span>
                </li>
              `;
            }).join('') : `<li class="muted" style="padding:14px 0">${t('tenderInfo.notLoaded')}</li>`}
          </ol>
        </div>
      </section>
    </div>

    <!-- Keep on Track Note -->
    <div class="note">
      ${icon('info')}
      <div>
        <strong>${t('tenderInfo.keepOnTrack')}</strong>
        <p>${t('tenderInfo.keepOnTrackSub')}</p>
      </div>
    </div>

    <!-- Page Bottom Controls -->
    <div class="page-bottom">
      <span class="small">${icon('shield')} ${t('tenderInfo.sampleWorkspaceNote')}</span>
      <div class="actions">
        <a class="btn primary" href="/upload-documents/">
          ${t('tenderInfo.continueUpload')} ${icon('chevron')}
        </a>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// PAGE 2: /upload-documents
// -------------------------------------------------------------
function renderUploadDocuments() {
  const counts = getCounts();

  return `
    <div class="page-head">
      <div>
        <h1>${t('routes.upload-documents.title')}</h1>
        <p>${t('routes.upload-documents.sub')}</p>
      </div>
      <div class="actions">
        <button class="btn" data-action="clear-all">${icon('trash')} ${t('uploadedDocs.clearAll')}</button>
      </div>
    </div>

    <div class="two-col">
      <!-- Left Column: Dropzone and Uploaded Files List -->
      <section class="card">
        <div class="card-head">
          <div>
            <h2>${t('uploadedDocs.uploadTitle')}</h2>
          </div>
        </div>
        <div class="card-body">
          <div class="dropzone" id="dropzone">
            <div class="icon-box">${icon('upload')}</div>
            <h3>${t('uploadedDocs.uploadSub')}</h3>
            <p>${t('uploadedDocs.uploadPrompt')}</p>
            <div style="display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap;">
              <button class="btn primary" data-action="browse-pdf">
                ${icon('plus')} ${t('uploadedDocs.browseBtn')}
              </button>
              <button class="btn" data-action="browse-seal">
                ${icon('upload')} ${t('uploadedDocs.uploadSealBtn')}
              </button>
            </div>
            <small>${state.lang === 'bn' ? 'PDF ফাইল এবং অফিসিয়াল সিল (PNG) সাপোর্ট করে' : 'Supports tender PDF files & company seal stamp (PNG)'}</small>
          </div>

          <!-- Official Seal / Stamp Card -->
          <div style="margin-top:18px;border:1px dashed ${state.sealPreviewUrl ? 'var(--green)' : 'var(--line)'};background:${state.sealPreviewUrl ? 'var(--green-soft)' : 'var(--surface)'};padding:14px 16px;border-radius:var(--radius-card);display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;box-shadow:var(--shadow-card);">
            <div style="display:flex;align-items:center;gap:12px;min-width:0;">
              ${state.sealPreviewUrl ? `
                <div style="width:48px;height:48px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                  <img src="${state.sealPreviewUrl}" alt="Official Seal" style="max-width:100%;max-height:100%;object-fit:contain;" />
                </div>
              ` : `
                <div class="icon-box" style="width:40px;height:40px;margin:0;background:var(--soft);color:var(--brand);flex-shrink:0;">
                  ${icon('check')}
                </div>
              `}
              <div style="min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <strong style="font-size:14px;">${t('uploadedDocs.sealTitle')}</strong>
                  ${state.sealPreviewUrl
                    ? `<span class="badge green" style="font-size:11px;">${icon('check')} ${t('uploadedDocs.sealAttached')}</span>`
                    : `<span class="badge" style="font-size:11px;background:#e2e8f0;color:#64748b;">${state.lang === 'bn' ? 'ঐচ্ছিক' : 'Optional'}</span>`}
                </div>
                <p class="muted small" style="margin-top:2px;">
                  ${state.sealFileName ? `${esc(state.sealFileName)} · ${state.lang === 'bn' ? 'প্যাকেজে সিল হিসেবে স্ট্যাম্প হবে' : 'Imprinted on cover & package documents'}` : t('uploadedDocs.sealSub')}
                </p>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0;">
              ${state.sealPreviewUrl ? `
                <button class="btn text" data-action="remove-seal" style="color:var(--red);">
                  ${icon('trash')} ${t('uploadedDocs.removeSeal')}
                </button>
                <button class="btn" data-action="browse-seal">
                  ${state.lang === 'bn' ? 'পরিবর্তন' : 'Change'}
                </button>
              ` : `
                <button class="btn" data-action="browse-seal">
                  ${icon('upload')} ${t('uploadedDocs.uploadSealBtn')}
                </button>
              `}
            </div>
          </div>

          <div class="files-list">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 0 6px">
              <h3>${t('uploadedDocs.title')} <span class="muted small">(${state.uploadedFiles.length})</span></h3>
              <button class="btn text" data-action="browse-pdf">${t('uploadedDocs.addFiles')}</button>
            </div>

            ${state.uploadedFiles.length ? state.uploadedFiles.map(f => {
              const dupBadge = f.isDuplicate
                ? `<span class="badge orange">${icon('alert')} ${t('uploadedDocs.duplicateBadge')}</span>`
                : `<span class="badge green">${icon('check')} ${t('uploadedDocs.unique')}</span>`;

              return `
                <div class="file-row">
                  <div class="file-icon">${icon('file')}</div>
                  <div class="file-info">
                    <strong>${esc(f.name)}</strong>
                    <p>${formatBytes(f.size)} · ${f.pageCount || 1} ${state.lang === 'bn' ? 'পৃষ্ঠা' : 'pages'}</p>
                  </div>
                  ${dupBadge}
                  <button class="icon-btn" data-remove-file="${esc(f.id)}" aria-label="${t('buttons.remove')}: ${esc(f.name)}">
                    ${icon('trash')}
                  </button>
                </div>
              `;
            }).join('') : `
              <div class="empty">
                <p><strong>${t('uploadedDocs.noFiles')}</strong></p>
                <p class="muted small" style="margin-top:4px">${t('uploadedDocs.noFilesSub')}</p>
              </div>
            `}
          </div>
        </div>
      </section>

      <!-- Right Column: Upload Checklist & Readiness -->
      <aside>
        <section class="card">
          <div class="card-head">
            <h2>${t('uploadedDocs.checklistHeader')}</h2>
          </div>
          <div class="card-body">
            <ul class="guidelines">
              <li>
                <div class="icon">${icon('check')}</div>
                <div>
                  <strong>${t('uploadedDocs.g1Title')}</strong>
                  <p>${t('uploadedDocs.g1Sub')}</p>
                </div>
              </li>
              <li>
                <div class="icon">${icon('check')}</div>
                <div>
                  <strong>${t('uploadedDocs.g2Title')}</strong>
                  <p>${t('uploadedDocs.g2Sub')}</p>
                </div>
              </li>
              <li>
                <div class="icon">${icon('check')}</div>
                <div>
                  <strong>${t('uploadedDocs.g3Title')}</strong>
                  <p>${t('uploadedDocs.g3Sub')}</p>
                </div>
              </li>
              <li>
                <div class="icon">${icon('check')}</div>
                <div>
                  <strong>${t('uploadedDocs.g4Title')}</strong>
                  <p>${t('uploadedDocs.g4Sub')}</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <div class="section-space">
          <div class="card readiness">
            <h3>${t('readiness.title')}</h3>
            <div class="ring" style="--pct:${counts.pct}">
              <strong>${counts.pct}%<small>${t('complete')}</small></strong>
            </div>
            <p>${counts.valid} / ${counts.total} ${t('readiness.matchedRatio')}</p>
          </div>
        </div>
      </aside>
    </div>

    <!-- Page Bottom Controls -->
    <div class="page-bottom">
      <a class="btn" href="/tender-details/">${icon('chevron', 'rotate-180')} ${t('buttons.back')}</a>
      <div class="actions">
        <a class="btn primary" href="/match-check/">
          ${t('uploadedDocs.continueMatch')} ${icon('chevron')}
        </a>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// PAGE 3: /match-check
// -------------------------------------------------------------
function renderMatchCheck() {
  const counts = getCounts();

  const filteredRequirements = state.requirements.filter(r => {
    const st = state.statuses[r.id];
    if (state.filter === 'valid') return st === 'OK';
    if (state.filter === 'missing') return st === 'Missing';
    if (state.filter === 'expired') return st === 'Expired' || st === 'Expiry date needed';
    return true;
  });

  return `
    <div class="page-head">
      <div>
        <h1>${t('routes.match-check.title')}</h1>
        <p>${t('routes.match-check.sub')}</p>
      </div>
      <div class="actions">
        <button class="btn" data-action="auto-match">${icon('refresh')} ${t('matchCheck.autoMatchBtn')}</button>
      </div>
    </div>

    <!-- Stats 3-Card Row -->
    <div class="stats">
      <div class="card stat">
        <div class="icon-box">${icon('list')}</div>
        <div>
          <strong>${counts.total}</strong>
          <p>${t('readiness.totalDocs')}</p>
        </div>
      </div>
      <div class="card stat">
        <div class="icon-box green">${icon('check')}</div>
        <div>
          <strong>${counts.valid}</strong>
          <p>${t('readiness.matchedDocs')}</p>
        </div>
      </div>
      <div class="card stat">
        <div class="icon-box orange">${icon('alert')}</div>
        <div>
          <strong>${counts.missing + counts.expired}</strong>
          <p>${t('readiness.needsAttention')}</p>
        </div>
      </div>
    </div>

    <!-- Requirements Matching Table Card -->
    <section class="card">
      <div class="card-head">
        <div>
          <h2>${t('matchCheck.reqCardTitle')}</h2>
          <p>${t('matchCheck.reqCardSub')}</p>
        </div>
      </div>

      <!-- Filter Buttons -->
      <div class="filters">
        <button class="filter ${state.filter === 'all' ? 'selected' : ''}" data-filter="all">${t('matchCheck.filterAll')}</button>
        <button class="filter ${state.filter === 'valid' ? 'selected' : ''}" data-filter="valid">${t('matchCheck.filterMatched')}</button>
        <button class="filter ${state.filter === 'missing' ? 'selected' : ''}" data-filter="missing">${t('matchCheck.filterMissing')}</button>
        <button class="filter ${state.filter === 'expired' ? 'selected' : ''}" data-filter="expired">${t('matchCheck.filterExpired')}</button>
      </div>

      <!-- Table Scroll -->
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>${t('matchCheck.colReq')}</th>
              <th>${t('matchCheck.colFile')}</th>
              <th>${t('matchCheck.colExpiry')}</th>
              <th>${t('matchCheck.colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRequirements.length ? filteredRequirements.map(req => {
              const reqTitle = state.lang === 'bn' ? (req.title_bn || req.title_en) : (req.title_en || req.name);
              const isMandatory = req.mandatory !== false;
              const hasExpiry = Boolean(req.has_expiry || req.requires_expiry || req.expiryRequired);
              const curMatch = state.matches[req.id] || '';
              const curExpiry = state.expiryDates[req.id] || '';
              const curStatus = state.statuses[req.id] || 'Missing';

              let statusBadge = '';
              if (curStatus === 'OK') {
                statusBadge = `<span class="badge green">${icon('check')} ${t('statuses.ok')}</span>`;
              } else if (curStatus === 'Missing') {
                statusBadge = `<span class="badge red">${icon('alert')} ${t('statuses.missing')}</span>`;
              } else if (curStatus === 'Expiry date needed') {
                statusBadge = `<span class="badge orange">${icon('clock')} ${t('statuses.expiryNeeded')}</span>`;
              } else if (curStatus === 'Expired') {
                statusBadge = `<span class="badge red">${icon('alert')} ${t('statuses.expired')}</span>`;
              } else {
                statusBadge = `<span class="badge gray">${t('statuses.notProvided')}</span>`;
              }

              return `
                <tr>
                  <td>
                    <div class="table-doc">
                      ${icon('file')}
                      <div>
                        <strong>${esc(reqTitle)}</strong>
                        <small>${isMandatory ? (state.lang === 'bn' ? 'আবশ্যক' : 'Required') : (state.lang === 'bn' ? 'ঐচ্ছিক' : 'Optional')}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select aria-label="${esc(reqTitle)} file" data-match-id="${esc(req.id)}">
                      <option value="">${t('matchCheck.noFileSelected')}</option>
                      ${state.uploadedFiles.map(f => {
                        const isSelected = curMatch === f.id ? 'selected' : '';
                        return `<option value="${esc(f.id)}" ${isSelected}>${esc(f.name)} (${f.pageCount || 1}p)</option>`;
                      }).join('')}
                    </select>
                  </td>
                  <td>
                    ${hasExpiry ? `
                      <input type="date" aria-label="${esc(reqTitle)} expiry" data-expiry-id="${esc(req.id)}" value="${esc(curExpiry)}" />
                    ` : `
                      <span class="muted small">${t('matchCheck.notRequired')}</span>
                    `}
                  </td>
                  <td>
                    ${statusBadge}
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="4" class="empty">
                  ${state.lang === 'bn' ? 'এই ফিল্টারে কোনো ডকুমেন্ট নেই।' : 'No documents match this filter.'}
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Review Before Submitting Banner -->
    <div class="note">
      ${icon('shield')}
      <div>
        <strong>${t('matchCheck.reviewBeforeSubmit')}</strong>
        <p>${t('matchCheck.reviewBeforeSubmitSub')}</p>
      </div>
    </div>

    <!-- Page Bottom Controls -->
    <div class="page-bottom">
      <a class="btn" href="/upload-documents/">${icon('chevron', 'rotate-180')} ${t('buttons.back')}</a>
      <div class="actions">
        <a class="btn primary" href="/preview/">
          ${t('matchCheck.continuePreview')} ${icon('chevron')}
        </a>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// PAGE 4: /preview
// -------------------------------------------------------------
function renderPreview() {
  const d = state.tender || {
    tender_id: '—',
    title: '—',
    procuring_entity: '—',
    bidder: '—',
    submission_deadline: ''
  };

  const counts = getCounts();

  const includedDocs = state.requirements.filter(r => state.matches[r.id]);
  const hasBlockers = state.blockingReasons.length > 0;

  return `
    <div class="page-head">
      <div>
        <h1>${t('routes.preview.title')}</h1>
        <p>${t('routes.preview.sub')}</p>
      </div>
      <div class="actions">
        <button class="btn" data-action="print-preview">${icon('print')} ${state.lang === 'bn' ? 'কভার প্রিন্ট' : 'Print Cover'}</button>
      </div>
    </div>

    <div class="preview-layout">
      <!-- Left: Realistic A4 Paper Sheet -->
      <div class="paper-shell">
        <div class="paper-toolbar">
          <span>${icon('file')} ${t('preview.coverPage')}</span>
          <span>${t('preview.a4Portrait')}</span>
        </div>

        <article class="paper" id="paperCover">
          <div class="paper-top">
            <div>
              <div class="eyebrow" style="color:var(--brand);font-size:11px;letter-spacing:1.5px;">
                ${t('preview.tenderPackageTitle')}
              </div>
              <span style="font-size:13px;font-family:ui-monospace,Menlo,Consolas,monospace;color:#64748b;font-weight:700;">
                ${esc(d.tender_id)}
              </span>
            </div>
            <div class="brand-mark">
              ${icon('file')}
            </div>
          </div>

          <h2>${esc(d.title)}</h2>
          <p class="paper-sub">${esc(d.procuring_entity)}</p>

          <div class="paper-meta">
            <div>
              <small>${t('tenderInfo.bidder')}</small>
              <strong>${esc(d.bidder)}</strong>
            </div>
            <div>
              <small>${t('tenderInfo.submissionDeadline')}</small>
              <strong>${formatDate(d.submission_deadline)}</strong>
            </div>
          </div>

          <h3>${t('preview.includedDocs')}</h3>
          <table>
            <thead>
              <tr>
                <th style="width:40px;">${t('preview.orderCol')}</th>
                <th>${t('preview.docCol')}</th>
                <th>${t('uploadedDocs.fileName')}</th>
                <th>${t('preview.statusCol')}</th>
              </tr>
            </thead>
            <tbody>
              ${includedDocs.length ? includedDocs.map((r, i) => {
                const docName = state.lang === 'bn' ? (r.title_bn || r.title_en) : (r.title_en || r.name);
                const file = state.uploadedFiles.find(f => f.id === state.matches[r.id]);
                const st = state.statuses[r.id];
                const stColor = st === 'OK' ? '#158060' : '#b77813';
                return `
                  <tr>
                    <td>${String(i + 1).padStart(2, '0')}</td>
                    <td><strong>${esc(docName)}</strong></td>
                    <td class="muted">${esc(file?.name || '—')}</td>
                    <td style="color:${stColor};font-weight:600;">${esc(st === 'OK' ? (state.lang === 'bn' ? 'বৈধ' : 'Valid') : st)}</td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="4" class="empty">${state.lang === 'bn' ? 'কোনো ফাইল ম্যাচ করা হয়নি।' : 'No documents matched yet.'}</td>
                </tr>
              `}
            </tbody>
          </table>

          ${state.sealPreviewUrl ? `
            <div class="paper-seal-box" style="margin-top:20px;padding:12px 16px;border:1px dashed #94a3b8;border-radius:6px;background:#f8fafc;display:flex;align-items:center;justify-content:space-between;gap:16px;">
              <div>
                <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#1e40af;text-transform:uppercase;">OFFICIAL SEAL & SIGNATURE</div>
                <div style="font-size:12px;font-weight:600;color:#1e293b;margin-top:2px;">${esc(d.bidder)}</div>
                <div style="font-size:10px;color:#64748b;">${esc(state.sealFileName || 'Bidder Seal')}</div>
              </div>
              <img src="${state.sealPreviewUrl}" alt="Official Seal" style="max-height:48px;max-width:130px;object-fit:contain;background:#fff;padding:2px;border:1px solid #cbd5e1;border-radius:4px;" />
            </div>
          ` : ''}

          <p class="paper-disclaimer">
            ${state.lang === 'bn' ? 'অফিসিয়াল টেন্ডার প্যাকেজ কভার শীট · AI DevFest ২০২৬' : 'Official Tender Submission Package Cover Page · Verified with TenderDoc Builder'}
          </p>

          <div class="paper-foot">
            <span>TenderDoc Builder</span>
            <span>${state.lang === 'bn' ? 'পৃষ্ঠা ১' : 'Page 1'}</span>
          </div>
        </article>
      </div>

      <!-- Right Aside: Submission Summary & Review Checks -->
      <aside class="preview-side">
        <section class="card">
          <div class="card-body">
            <h3>${t('preview.summaryTitle')}</h3>
            <ul class="summary-list">
              <li>
                <span class="muted">${icon('file')} ${t('preview.totalReq')}</span>
                <strong>${state.requirements.length}</strong>
              </li>
              <li>
                <span class="muted">${icon('check')} ${t('preview.docsMatched')}</span>
                <strong>${counts.valid}</strong>
              </li>
              <li>
                <span class="muted">${icon('alert')} ${t('preview.missingReq')}</span>
                <strong style="color:var(--red);">${counts.missing}</strong>
              </li>
              <li>
                <span class="muted">${icon('clock')} ${t('preview.expiredDocs')}</span>
                <strong style="color:var(--orange);">${counts.expired}</strong>
              </li>
              <li>
                <span class="muted">${icon('info')} ${t('preview.optNotProvided')}</span>
                <strong>${counts.optional}</strong>
              </li>
              <li>
                <span class="muted">${icon('check')} ${state.lang === 'bn' ? 'অফিসিয়াল সিল' : 'Official Seal'}</span>
                <strong>${state.sealPreviewUrl ? (state.lang === 'bn' ? 'যুক্ত রয়েছে' : 'Attached') : (state.lang === 'bn' ? 'ঐচ্ছিক' : 'Optional')}</strong>
              </li>
            </ul>

            <div style="border-top:1px solid var(--line);padding-top:18px;">
              <a class="btn primary full-btn" href="/generate/">
                ${icon('file')} ${t('preview.continueGenerate')}
              </a>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-body">
            <h3>${t('preview.reviewChecksTitle')}</h3>
            <div class="check-line">
              ${icon('check')}
              <span>${t('preview.checkOrder')}</span>
            </div>
            <div class="check-line">
              ${icon('check')}
              <span>${t('preview.checkExpiry')}</span>
            </div>
            <div class="check-line ${hasBlockers ? 'warn' : ''}">
              ${icon(hasBlockers ? 'alert' : 'check')}
              <span>${hasBlockers ? t('preview.checkResolve') : t('preview.checkAllValid')}</span>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <!-- Page Bottom Controls -->
    <div class="page-bottom">
      <a class="btn" href="/match-check/">${icon('chevron', 'rotate-180')} ${t('buttons.back')}</a>
      <div class="actions">
        <a class="btn primary" href="/generate/">
          ${t('preview.continueGenerate')} ${icon('chevron')}
        </a>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// PAGE 5: /generate
// -------------------------------------------------------------
function renderGenerate() {
  const counts = getCounts();
  const hasBlockers = state.blockingReasons.length > 0;
  const isGenerating = state.isGenerating;

  const totalPagesEstimate = state.requirements.reduce((sum, r) => {
    const fileId = state.matches[r.id];
    if (fileId) {
      const f = state.uploadedFiles.find(x => x.id === fileId);
      return sum + (f?.pageCount || 1);
    }
    return sum;
  }, 1 + (state.includeIndexPage ? 1 : 0)); // +1 for cover page

  return `
    <div class="page-head">
      <div>
        <h1>${t('routes.generate.title')}</h1>
        <p>${t('routes.generate.sub')}</p>
      </div>
    </div>

    <div class="two-col">
      <!-- Left Column: Generate Action & Package Box -->
      <section class="card generate-main">
        <div class="icon-box ${hasBlockers ? 'orange' : 'green'}">
          ${icon('file')}
        </div>

        <span class="badge ${hasBlockers ? 'orange' : 'green'}" style="font-size:13px;padding:6px 14px;">
          ${icon(hasBlockers ? 'alert' : 'check')}
          ${hasBlockers ? (state.lang === 'bn' ? 'বাধা রয়েছে' : 'Needs attention') : (state.lang === 'bn' ? 'প্যাকেজ প্রস্তুত' : 'Ready to compile')}
        </span>

        <h2 style="margin-top:16px;">${t('generate.readyTitle')}</h2>
        <p>${t('generate.readySub')}</p>

        <div class="package-box">
          <div class="icon">${icon('folder')}</div>
          <div>
            <h3>${esc(state.tender?.tender_id || 'Tender')}_Package.pdf</h3>
            <p>${t('generate.packageBoxSub')} · ${counts.valid} ${state.lang === 'bn' ? 'টি ফাইল অন্তর্ভুক্ত' : 'files matched'} · ~${totalPagesEstimate} ${state.lang === 'bn' ? 'পৃষ্ঠা' : 'pages'}</p>
          </div>
        </div>

        ${hasBlockers ? `
          <div class="blocking-box">
            <h4>${icon('alert')} ${t('generate.blockingTitle')}</h4>
            <ul>
              ${state.blockingReasons.map(r => `<li>${esc(r)} <a href="/match-check/">${state.lang === 'bn' ? 'ঠিক করুন' : 'Resolve'}</a></li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div style="margin-top:22px;display:flex;flex-direction:column;align-items:center;gap:12px;">
          <button class="btn primary" style="min-width:240px;min-height:48px;font-size:15px;" data-action="generate-package" ${hasBlockers || isGenerating ? 'disabled' : ''}>
            ${icon(isGenerating ? 'refresh' : 'download')}
            ${isGenerating ? t('generate.btnGenerating') : t('generate.btnDownload')}
          </button>

          <button class="btn" data-action="export-csv">
            ${icon('download')} ${t('generate.btnExportCsv')}
          </button>
        </div>
      </section>

      <!-- Right Column: Package Summary & Checklist -->
      <aside>
        <section class="card">
          <div class="card-head">
            <h2>${t('preview.summaryTitle')}</h2>
          </div>
          <div class="card-body" style="padding-top:0;">
            <ul class="summary-list">
              <li>
                <span class="muted">${icon('file')} ${t('preview.totalReq')}</span>
                <strong>${state.requirements.length}</strong>
              </li>
              <li>
                <span class="muted">${icon('check')} ${t('preview.docsMatched')}</span>
                <strong>${counts.valid}</strong>
              </li>
              <li>
                <span class="muted">${icon('alert')} ${t('preview.missingReq')}</span>
                <strong style="color:var(--red);">${counts.missing}</strong>
              </li>
              <li>
                <span class="muted">${icon('clock')} ${t('preview.expiredDocs')}</span>
                <strong style="color:var(--orange);">${counts.expired}</strong>
              </li>
              <li>
                <span class="muted">${icon('check')} ${state.lang === 'bn' ? 'অফিসিয়াল সিল' : 'Official Seal'}</span>
                <strong>${state.sealPreviewUrl ? (state.lang === 'bn' ? 'যুক্ত রয়েছে' : 'Attached') : (state.lang === 'bn' ? 'ঐচ্ছিক' : 'Optional')}</strong>
              </li>
            </ul>
          </div>
        </section>

        <section class="card section-space">
          <div class="card-head">
            <h2>${t('generate.beforeSubmitTitle')}</h2>
          </div>
          <div class="card-body" style="padding-top:8px;">
            <div class="check-line">
              ${icon('check')}
              <span>${t('generate.rule1')}</span>
            </div>
            <div class="check-line">
              ${icon('check')}
              <span>${t('generate.rule2')}</span>
            </div>
            <div class="check-line ${hasBlockers ? 'warn' : ''}">
              ${icon(hasBlockers ? 'alert' : 'check')}
              <span>${t('generate.rule3')}</span>
            </div>

            <div style="margin-top:16px;">
              <a class="btn full-btn" href="/match-check/">
                ${t('generate.returnMatch')}
              </a>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <!-- Page Bottom Controls -->
    <div class="page-bottom">
      <a class="btn" href="/preview/">${icon('chevron', 'rotate-180')} ${t('buttons.back')}</a>
      <div class="actions">
        <a class="btn" href="/preview/">
          ${icon('eye')} ${t('generate.viewPreview')}
        </a>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// MAIN SHELL RENDER
// -------------------------------------------------------------
function render() {
  const activeRouteId = currentRoute();
  const routeIndex = currentIndex();
  const counts = getCounts();

  document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
  document.body.classList.toggle('lang-bn', state.lang === 'bn');
  document.body.classList.toggle('dark', state.theme === 'dark');

  const routeName = t(`nav.step${routeIndex + 1}`) || ROUTES[routeIndex].id;
  document.title = `TenderDoc Builder — ${routeName}`;

  // Content for active route
  let pageContentHtml = '';
  if (activeRouteId === 'tender-details') pageContentHtml = renderTenderDetails();
  else if (activeRouteId === 'upload-documents') pageContentHtml = renderUploadDocuments();
  else if (activeRouteId === 'match-check') pageContentHtml = renderMatchCheck();
  else if (activeRouteId === 'preview') pageContentHtml = renderPreview();
  else if (activeRouteId === 'generate') pageContentHtml = renderGenerate();

  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = `
    <!-- 1. FIXED NAVY SIDEBAR -->
    <aside class="sidebar" id="sidebar">
      <a href="/tender-details/" class="brand" data-nav="tender-details">
        <span class="brand-mark">${icon('file')}</span>
        <div>
          TenderDoc
          <div class="brand-sub">${t('packageBuilder')}</div>
        </div>
      </a>

      <div class="eyebrow">${t('buildYourPackage')}</div>

      <nav aria-label="Package steps">
        ${ROUTES.map((r, k) => {
          const isActive = r.id === activeRouteId;
          const isDone = k < routeIndex;
          const stepTitle = t(`nav.step${k + 1}`);
          return `
            <a class="nav-item ${isActive ? 'active' : ''}" href="/${r.id}/" data-nav="${r.id}" ${isActive ? 'aria-current="page"' : ''}>
              <span class="nav-index">${r.num}</span>
              <span>${esc(stepTitle)}</span>
              ${isDone ? icon('check', 'tick') : ''}
            </a>
          `;
        }).join('')}
      </nav>

      <div class="sidebar-bottom">
        <div class="current-tender">
          <div class="eyebrow">${t('currentTender')}</div>
          <strong>${esc(state.tender?.tender_id || '—')}</strong>
          <p>${counts.pct}% ${t('complete').toLowerCase()}</p>
          <div class="mini-progress">
            <span style="width:${counts.pct}%"></span>
          </div>
        </div>

        <div class="sidebar-foot">
          ${icon('shield')}
          <span>${t('documentsStayInBrowser')}</span>
        </div>
      </div>
    </aside>

    <!-- 2. SHELL & TOPBAR -->
    <div class="shell">
      <header class="topbar">
        <div class="mobile-crumb">
          <button class="icon-btn mobile-menu" data-action="toggle-menu" aria-label="Open Navigation">
            ${icon('menu')}
          </button>
          <div class="breadcrumb">
            <span>${t('workspace')}</span>
            <span>/</span>
            <strong>${esc(routeName)}</strong>
          </div>
        </div>

        <div class="top-actions">
          <span class="demo-badge">${t('prototypeBadge')}</span>

          <!-- Language Pill Switch -->
          <div class="languages" aria-label="Language">
            <button data-action="lang-en" class="${state.lang === 'en' ? 'selected' : ''}">EN</button>
            <button data-action="lang-bn" class="${state.lang === 'bn' ? 'selected' : ''}">বাংলা</button>
          </div>

          <!-- Theme Toggle -->
          <button class="icon-btn" data-action="toggle-theme" aria-label="Toggle Theme">
            ${icon(state.theme === 'dark' ? 'sun' : 'moon')}
          </button>

          <!-- Settings & Tools -->
          <button class="icon-btn" data-action="open-settings" aria-label="Settings & Tools">
            ${icon('folder')}
          </button>
        </div>
      </header>

      <!-- 3. MAIN ROUTED CONTENT -->
      <main class="content">
        ${pageContentHtml}

        <footer class="footer">
          <span>TenderDoc Builder <span style="padding:0 7px">·</span> AI DevFest 2026</span>
          <span>${state.lang === 'bn' ? 'নিশ্চিন্তে প্রস্তুত করুন।' : 'Prepared with confidence.'}</span>
        </footer>
      </main>
    </div>

    <!-- Hidden File Inputs -->
    <input class="hidden" id="inputPdf" type="file" accept="application/pdf,.pdf,image/png,.png" multiple />
    <input class="hidden" id="inputSeal" type="file" accept="image/png,.png" />
    <input class="hidden" id="inputJson" type="file" accept="application/json,.json" />
  `;

  bindEvents();
}

// -------------------------------------------------------------
// EVENT BINDINGS
// -------------------------------------------------------------
function bindEvents() {
  // SPA Navigation Interception
  document.querySelectorAll('a[data-nav], a[href^="/"]').forEach(a => {
    a.onclick = e => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('/')) {
        e.preventDefault();
        const route = href.replace(/^\/+|\/+$/g, '');
        navigate(route);
      }
    };
  });

  // Action Buttons
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const action = btn.dataset.action;

      if (action === 'toggle-menu') {
        const s = document.getElementById('sidebar');
        s?.classList.toggle('open');
      } else if (action === 'lang-en') {
        state.lang = 'en';
        sessionStorage.setItem('td-lang', 'en');
        recalculateStatuses();
        render();
      } else if (action === 'lang-bn') {
        state.lang = 'bn';
        sessionStorage.setItem('td-lang', 'bn');
        recalculateStatuses();
        render();
      } else if (action === 'toggle-theme') {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        sessionStorage.setItem('td-theme', state.theme);
        render();
      } else if (action === 'open-settings') {
        openSettingsModal();
      } else if (action === 'load-json') {
        document.getElementById('inputJson')?.click();
      } else if (action === 'view-json') {
        openViewJsonModal();
      } else if (action === 'edit-bidder') {
        openEditBidderModal();
      } else if (action === 'browse-pdf') {
        document.getElementById('inputPdf')?.click();
      } else if (action === 'browse-seal') {
        document.getElementById('inputSeal')?.click();
      } else if (action === 'remove-seal') {
        removeSeal();
      } else if (action === 'clear-all') {
        if (confirm(state.lang === 'bn' ? 'সব আপলোডকৃত ফাইল মুছে ফেলবেন?' : 'Clear all uploaded files?')) {
          state.uploadedFiles = [];
          state.matches = {};
          recalculateStatuses();
          render();
        }
      } else if (action === 'auto-match') {
        autoMatch();
      } else if (action === 'print-preview') {
        window.print();
      } else if (action === 'generate-package') {
        executePackageGeneration();
      } else if (action === 'export-csv') {
        handleExportCSV();
      }
    };
  });

  // Remove File Button
  document.querySelectorAll('[data-remove-file]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const fileId = btn.dataset.removeFile;
      state.uploadedFiles = state.uploadedFiles.filter(f => f.id !== fileId);
      for (const k of Object.keys(state.matches)) {
        if (state.matches[k] === fileId) {
          delete state.matches[k];
        }
      }
      recalculateStatuses();
      render();
    };
  });

  // Table Select File Match
  document.querySelectorAll('[data-match-id]').forEach(sel => {
    sel.onchange = () => {
      const reqId = sel.dataset.matchId;
      const fileId = sel.value;
      if (fileId) {
        state.matches[reqId] = fileId;
      } else {
        delete state.matches[reqId];
      }
      recalculateStatuses();
      render();
    };
  });

  // Table Expiry Date Input
  document.querySelectorAll('[data-expiry-id]').forEach(inp => {
    inp.onchange = () => {
      const reqId = inp.dataset.expiryId;
      state.expiryDates[reqId] = inp.value;
      recalculateStatuses();
      render();
    };
  });

  // Table Filter Tabs
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.onclick = () => {
      state.filter = btn.dataset.filter;
      render();
    };
  });

  // File Inputs
  const inputPdf = document.getElementById('inputPdf');
  if (inputPdf) {
    inputPdf.onchange = e => {
      if (e.target.files && e.target.files.length > 0) {
        handleFilesUpload(e.target.files);
        inputPdf.value = '';
      }
    };
  }

  const inputSeal = document.getElementById('inputSeal');
  if (inputSeal) {
    inputSeal.onchange = e => {
      if (e.target.files && e.target.files[0]) {
        handleSealUpload(e.target.files[0]);
        inputSeal.value = '';
      }
    };
  }

  const inputJson = document.getElementById('inputJson');
  if (inputJson) {
    inputJson.onchange = e => {
      if (e.target.files && e.target.files[0]) {
        handleRequirementsUpload(e.target.files[0]);
        inputJson.value = '';
      }
    };
  }

  // Drag and Drop Zone
  const dz = document.getElementById('dropzone');
  if (dz) {
    dz.ondragover = e => {
      e.preventDefault();
      dz.classList.add('drag');
    };
    dz.ondragleave = () => {
      dz.classList.remove('drag');
    };
    dz.ondrop = e => {
      e.preventDefault();
      dz.classList.remove('drag');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFilesUpload(e.dataTransfer.files);
      }
    };
  }
}

// Global Drawer dismissal
document.addEventListener('click', e => {
  const s = document.getElementById('sidebar');
  if (s?.classList.contains('open') && !e.target.closest('.sidebar') && !e.target.closest('[data-action="toggle-menu"]')) {
    s.classList.remove('open');
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('sidebar')?.classList.remove('open');
  }
});

// App Initialization
async function init() {
  // If at root '/', redirect cleanly to '/tender-details'
  const p = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (!p) {
    window.history.replaceState(null, '', '/tender-details');
  }

  // Pre-load default requirements from /requirements.json if none loaded yet
  try {
    const res = await fetch('/requirements.json');
    if (res.ok) {
      const data = await res.json();
      const norm = normalizeRequirements(data);
      state.tender = norm.tender;
      state.requirements = norm.requirements;
    }
  } catch (err) {
    console.warn('Initial requirements fetch skipped:', err);
  }

  recalculateStatuses();
  render();
}

init();
