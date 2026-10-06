# Tender Document Package Builder

> **AI DevFest 2026 — Official AI Vibe-Coding Contest (Solo)**  
> Built for the Daffodil International University AI DevFest 2026.

---

## 👤 Participant Information
- **Name:** Fayek Ahanaf
- **Registration Number:** `252-16-056`
- **GitHub Repository:** [https://github.com/dev-ahanaf/devfest-252-16-056](https://github.com/dev-ahanaf/devfest-252-16-056)
- **Public HTTPS Live Website:** [https://tenderdoc-builder.vercel.app/](https://tenderdoc-builder.vercel.app/)

---

## 📖 Project Overview
**Tender Document Package Builder** is a high-performance, purely client-side web application designed to help office staff transform a collection of tender-related PDF documents into a verified, compliant, and correctly ordered PDF package ready for submission.

The application follows the **Official Rulebook** and the **Problem Statement** to the letter:
- Zero backend dependencies (pure browser-based execution with `pdf-lib` and Web Crypto API).
- High visual aesthetics inspired by modern glassmorphism dashboards.
- Full bilingual support (Bangla & English) with Google Fonts `Noto Sans Bengali` and `Inter`.
- Strict verification rules for duplicates, missing documents, and expiry dates.
- Compliant PDF generation with custom cover page, ~36pt bottom margin shift, and `<tender_id> | Page X of Y` footer.

---

## 🚀 How to Run the Application

### Option 1: Live Demo (No installation required)
Simply open the public HTTPS link in Google Chrome:
👉 **[https://tenderdoc-builder.vercel.app/](https://tenderdoc-builder.vercel.app/)**

### Option 2: Run Locally
1. **Clone the repository:**
   ```bash
   git clone https://github.com/dev-ahanaf/devfest-252-16-056.git
   cd devfest-252-16-056
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in Google Chrome.

4. **Build production bundle:**
   ```bash
   npm run build
   npm run preview
   ```

---

## ✨ Features Completed

### Main Tasks (Problem Statement §4, §5 & §6)
- [x] **4.1 Requirements Loading & Display:** Loads `requirements.json`, parses and displays tender metadata (Tender ID, Title, Procuring Entity, Bidder, Submission Deadline) and required documents sorted by `order`.
- [x] **4.2 Multi-PDF Upload & Validation:** Supports multi-file drag-and-drop and file picker (up to 30 files / 50 MB). Accurately extracts page counts using `pdf-lib`. Rejects non-PDF files via file extension, MIME type, and `%PDF-` binary magic header check. Allows deleting/clearing uploaded files.
- [x] **4.3 1-to-1 Document Matching:** Enforces strictly that one document gets at most one file, and one file goes to at most one document. Includes undo button to unmatch.
- [x] **4.4 Expiry Date Management:** Provides date inputs for documents with `has_expiry = true`.
- [x] **4.5 Real-Time Status Engine:** Instant recalculation after every user action. Each required document shows exactly ONE status:
  - `Missing`: Mandatory document, no file matched (**Blocks package**).
  - `Expiry date needed`: `has_expiry = true` and file matched, but no date entered (**Blocks package**).
  - `Expired`: Expiry date is before the submission deadline (**Blocks package**).
  - `Not provided`: Optional document, no file matched (Does **not** block).
  - `OK`: File matched, and (if `has_expiry`) expiry date is on or after the submission deadline (**Same-day expiry = OK**).
- [x] **Safe Date Comparison:** Dates compared strictly as `YYYY-MM-DD` strings to prevent timezone shifts.
- [x] **4.6 SHA-256 Duplicate Detection:** Computes cryptographic SHA-256 hashes of raw file byte buffers using Web Crypto API. Identical file contents (regardless of file names) are flagged with badge `Duplicate` and prohibited from cross-matching.
- [x] **4.7 Strict Package Blocking:** The Generate button is disabled while any blocking issue exists, displaying explicit reasons for each blocked document.
- [x] **4.8 Standardized Download:** Downloads the finalized PDF package as `<tender_id>_Package.pdf`.
- [x] **4.9 Full Bilingual Toggle (Bangla / English):** One-click toggle between English and বাংলা for all labels, buttons, messages, statuses, and document titles (`title_en` / `title_bn`). Uses `Noto Sans Bengali`.

### PDF Package Compliance (Problem Statement §6)
- [x] **6.1 English Cover Page (Page 1):** Features Tender ID, Tender Title, Procuring Entity, Bidder Name, Submission Deadline, Generation Date, and an ordered table of all included documents.
- [x] **6.2 Correct Ordering:** Documents ordered strictly by `order`. Optional documents without matched files are excluded.
- [x] **6.3 Standardized Footer:** Every page (including cover) has `<tender_id> | Page X of Y` centered at the bottom, where `Y` is the verified total page count.
- [x] **6.4 Content Preservation:** Each document page is drawn onto an expanded canvas with `~36pt` extra bottom margin so the footer never obscures original content. Rotated pages (`/Rotate`) and diverse page sizes are preserved accurately.

---

## 🎁 Bonus Features Completed
- [x] **Handle Bad Files Safely:** Gracefully detects and reports damaged, corrupt, or password-protected PDFs without crashing.
- [x] **Table of Contents / Index Page:** Option to include a Page 2 document index with starting page numbers while updating footer total count dynamically.
- [x] **CSV Checklist Export:** One-click export of the document checklist as CSV formatted with UTF-8 BOM (`\uFEFF`) for Excel compatibility.
- [x] **Smart Auto-Match:** Automatically suggests matches between uploaded PDFs and requirements based on title keyword similarity.
- [x] **Save & Restore Work:** LocalStorage persistence to save and reload matching progress at any time.
- [x] **Seal / Signature Placement:** Ability to upload an official seal PNG and place it on document pages.
- [x] **Dark & Light Mode:** Toggleable theme switch for comfortable day/night usage.
- [x] **View requirements.json:** In-app modal to inspect loaded requirements JSON cleanly without compliance risks.

---

## 🛠️ Tech Stack & Architecture
- **Framework:** Vite + Vanilla JavaScript (ES Modules) — maximum speed, zero bundle bloat.
- **PDF Engine:** `pdf-lib` (pure browser client-side execution).
- **Security:** Pure client-side processing, no participant-controlled backends or external database storage.
- **Typography:** Google Fonts (`Inter` + `Noto Sans Bengali`).

---

## 🧪 Sample Pack & Test Verification
The application was verified against the organizer-provided `sample-pack/`:
1. **requirements.json Loading:** Correctly loads Tender ID `T-2026-0417`, Procuring Entity `Directorate of Sample Services`, Bidder `Meghna Tech Solutions Ltd.`, and dynamically derives 10 requirements (8 mandatory, 2 optional) sorted by `order`.
2. **Document Upload & Format Validation:** Tested with `sample-pack/documents/`. Non-PDF files such as `company_logo.png` are cleanly rejected by magic header check, loading the 10 valid PDF files.
3. **SHA-256 Duplicate Detection:** Correctly identifies that `experience_cert (1).pdf` and `experience_cert.pdf` share identical content hashes and flags them.
4. **Expiry Verification:** Correctly detects `trade_license_2025.pdf` as expired relative to the tender deadline (`2026-10-20`), while `trade_license_2026.pdf` passes as valid.
5. **Multi-page & Scanned PDFs:** `02_technical_proposal.pdf` (6 pages) and `scan_0042.pdf` are accurately parsed and rendered.
6. **Package Generation:** Produces a verified, compliant merged PDF package with cover page and standardized `<tender_id> | Page X of Y` footers.

---

## ⚠️ Known Limitations
- Purely client-side browser execution: large PDF batches (>50MB) depend on available client-side device memory.

---

## 🤖 AI Tools Used
- **Google Antigravity IDE** with **Gemini 3.8 Flash (High)** model.

---

## 💬 Most Useful Prompt
> *"Use the fastest stack: Vite + vanilla JS, pdf-lib from npm, no heavy dependencies. Build in this order: 1. Skeleton + load requirements.json + tender details + sorted list + EN/BN switch, 2. Upload PDFs + SHA-256 duplicate detection, 3. Matching + expiry date input + live statuses, 4. Generate button with blocking reasons + PDF package (cover, ordered docs, footer) + download, 5. Test with sample-pack + deploy + README + output PDF + screenshots."*

---

## 📄 License
MIT License — Copyright (c) 2026 Fayek Ahanaf
