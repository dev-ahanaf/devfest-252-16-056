export const translations = {
  en: {
    appTitle: "TenderDoc Builder",
    appSubtitle: "Prepare • Check • Arrange • Package",
    steps: {
      step1: "Tender Details",
      step1Sub: "View tender information",
      step2: "Upload Documents",
      step2Sub: "Add PDF files",
      step3: "Match & Check",
      step3Sub: "Assign files and enter dates",
      step4: "Preview Package",
      step4Sub: "Review and reorder",
      step5: "Generate PDF",
      step5Sub: "Create final package"
    },
    sidebarBrandText: "Organize\nValidate\nCompile\nSubmit with Confidence",
    heroTitle: "Tender Document Package Builder",
    heroSubtitle: "Make a complete, verified and correctly ordered PDF package for tender submission.",
    heroFeatures: {
      upload: "Upload PDFs",
      uploadSub: "Add multiple files",
      autoCheck: "Auto Check",
      autoCheckSub: "Find issues early",
      match: "Match & Validate",
      matchSub: "Check expiry, duplicates",
      generate: "Generate Package",
      generateSub: "One click PDF"
    },
    tenderInfo: {
      title: "Tender Information",
      loadedSuccess: "Loaded Successfully",
      editJson: "Edit/View JSON",
      tenderId: "Tender ID",
      tenderTitle: "Tender Title",
      procuringEntity: "Procuring Entity",
      bidder: "Bidder",
      submissionDeadline: "Submission Deadline",
      loadBtn: "Load requirements.json"
    },
    uploadedDocs: {
      title: "Uploaded Documents",
      uploadBtn: "+ Upload PDFs",
      clearAll: "Clear All",
      fileName: "File Name",
      pages: "Pages",
      size: "Size",
      duplicate: "Duplicate",
      actions: "Actions",
      unique: "Unique",
      duplicateBadge: "Duplicate",
      noFiles: "No PDF files uploaded yet. Drag and drop or click '+ Upload PDFs'."
    },
    requiredDocs: {
      title: "Required Documents",
      sortByOrder: "Sort by Order",
      colNum: "#",
      colDoc: "Document",
      colMatched: "File Matched",
      colExpiry: "Expiry Date",
      colStatus: "Status",
      selectFile: "-- Select file --",
      unassigned: "None matched",
      noDate: "Set date",
      undo: "Undo Match"
    },
    statuses: {
      ok: "OK",
      missing: "Missing",
      expiryNeeded: "Expiry date needed",
      expired: "Expired",
      notProvided: "Not provided"
    },
    statusFilter: {
      ok: "OK",
      missing: "Missing",
      expiry: "Expiry",
      optional: "Optional"
    },
    readiness: {
      title: "Package Readiness",
      readySummary: "{ready} of {total} required documents ready",
      resolveBlocking: "Resolve blocking issues to generate package",
      allPassed: "All checks passed! Ready to generate package.",
      totalDocs: "Total Documents",
      matched: "Matched",
      missingReq: "Missing (Required)",
      expired: "Expired",
      optNotProvided: "Optional (Not provided)",
      generateBtn: "Generate PDF Package",
      fixIssues: "Fix all blocking issues to enable",
      blockingTitle: "Blocking Issues Detected:"
    },
    preview: {
      title: "Live Preview",
      pageOf: "Page {current} of {total}",
      coverTitle: "TENDER DOCUMENT PACKAGE",
      generatedOn: "Package Generated On",
      includedDocs: "Included Documents",
      emptyState: "Load requirements and match files to see live preview"
    },
    buttons: {
      download: "Download Package",
      csvExport: "Export CSV Checklist",
      autoMatch: "Auto-Match",
      saveWork: "Save Work",
      loadWork: "Load Work",
      close: "Close",
      cancel: "Cancel",
      apply: "Apply",
      remove: "Remove",
      previewFile: "Preview"
    },
    messages: {
      nonPdfRejected: "Rejected '{name}': Not a valid PDF file. Must have .pdf extension and %PDF header.",
      maxFilesExceeded: "Exceeded limit: You can upload up to 30 PDF files (max 50 MB total).",
      duplicateWarning: "Warning: '{name}' has identical content (SHA-256) to another uploaded file and cannot be matched to different documents.",
      alreadyMatched: "This file is already matched to another document.",
      passwordProtected: "Warning: '{name}' appears to be password-protected or encrypted. Please provide an unencrypted version.",
      damagedFile: "Error: Could not read '{name}'. The PDF file appears to be corrupted or damaged.",
      packageReady: "PDF package generated successfully!",
      savedSuccess: "Project progress saved to browser storage."
    }
  },
  bn: {
    appTitle: "টেন্ডারডক বিল্ডার",
    appSubtitle: "প্রস্তুতি • যাচাই • বিন্যাস • প্যাকেজিং",
    steps: {
      step1: "টেন্ডারের তথ্য",
      step1Sub: "টেন্ডার বিবরণ দেখুন",
      step2: "ডকুমেন্ট আপলোড",
      step2Sub: "পিডিএফ ফাইল যুক্ত করুন",
      step3: "ম্যাচিং ও যাচাই",
      step3Sub: "ফাইল অ্যাসাইন ও মেয়াদ দিন",
      step4: "প্যাকেজ প্রিভিউ",
      step4Sub: "পর্যালোচনা ও ক্রম ঠিক করুন",
      step5: "পিডিএফ তৈরি",
      step5Sub: "চূড়ান্ত প্যাকেজ তৈরি করুন"
    },
    sidebarBrandText: "বিন্যাস করুন\nযাচাই করুন\nএকত্রিত করুন\nনিশ্চিন্তে জমা দিন",
    heroTitle: "টেন্ডার ডকুমেন্ট প্যাকেজ বিল্ডার",
    heroSubtitle: "টেন্ডার জমা দেওয়ার জন্য একটি সম্পূর্ণ, যাচাইকৃত এবং সঠিক ক্রমানুসারে সাজানো পিডিএফ প্যাকেজ তৈরি করুন।",
    heroFeatures: {
      upload: "পিডিএফ আপলোড",
      uploadSub: "একাধিক ফাইল যোগ করুন",
      autoCheck: "স্বয়ংক্রিয় চেক",
      autoCheckSub: "সমস্যা দ্রুত শনাক্ত করুন",
      match: "ম্যাচ ও ভ্যালিডেট",
      matchSub: "মেয়াদ ও ডুপ্লিকেট চেক",
      generate: "প্যাকেজ তৈরি",
      generateSub: "এক ক্লিকে পিডিএফ"
    },
    tenderInfo: {
      title: "টেন্ডার সম্পর্কিত তথ্য",
      loadedSuccess: "সফলভাবে লোড হয়েছে",
      editJson: "JSON দেখুন/সম্পাদনা",
      tenderId: "টেন্ডার আইডি",
      tenderTitle: "টেন্ডারের নাম",
      procuringEntity: "সংগ্রহকারী কর্তৃপক্ষ",
      bidder: "দরপত্রদাতা",
      submissionDeadline: "জমা দেওয়ার শেষ সময়",
      loadBtn: "requirements.json লোড করুন"
    },
    uploadedDocs: {
      title: "আপলোডকৃত ডকুমেন্টস",
      uploadBtn: "+ পিডিএফ আপলোড",
      clearAll: "সব মুছুন",
      fileName: "ফাইলের নাম",
      pages: "পৃষ্ঠা",
      size: "আকার",
      duplicate: "ডুপ্লিকেট",
      actions: "অ্যাকশন",
      unique: "অনন্য (Unique)",
      duplicateBadge: "ডুপ্লিকেট",
      noFiles: "এখনো কোনো পিডিএফ আপলোড করা হয়নি। ফাইল ড্র্যাগ করে ছাড়ুন অথবা '+ পিডিএফ আপলোড' এ ক্লিক করুন।"
    },
    requiredDocs: {
      title: "প্রয়োজনীয় ডকুমেন্টস",
      sortByOrder: "ক্রম অনুযায়ী সাজান",
      colNum: "#",
      colDoc: "ডকুমেন্ট",
      colMatched: "সংযুক্ত ফাইল",
      colExpiry: "মেয়াদোত্তীর্ণের তারিখ",
      colStatus: "স্ট্যাটাস",
      selectFile: "-- ফাইল নির্বাচন করুন --",
      unassigned: "কোনো ফাইল নেই",
      noDate: "তারিখ দিন",
      undo: "ম্যাচ বাতিল করুন"
    },
    statuses: {
      ok: "সঠিক (OK)",
      missing: "অনুপস্থিত (Missing)",
      expiryNeeded: "মেয়াদ প্রয়োজন",
      expired: "মেয়াদোত্তীর্ণ (Expired)",
      notProvided: "দেওয়া হয়নি (Optional)"
    },
    statusFilter: {
      ok: "সঠিক",
      missing: "অনুপস্থিত",
      expiry: "মেয়াদ",
      optional: "ঐচ্ছিক"
    },
    readiness: {
      title: "প্যাকেজের প্রস্তুতি",
      readySummary: "{total} টির মধ্যে {ready} টি আবশ্যক ডকুমেন্ট প্রস্তুত",
      resolveBlocking: "প্যাকেজ তৈরি করতে বাধা সৃষ্টিকারী সমস্যাগুলো সমাধান করুন",
      allPassed: "সব যাচাই সম্পন্ন! প্যাকেজ তৈরির জন্য প্রস্তুত।",
      totalDocs: "মোট ডকুমেন্টস",
      matched: "সংযুক্ত",
      missingReq: "অনুপস্থিত (আবশ্যক)",
      expired: "মেয়াদোত্তীর্ণ",
      optNotProvided: "ঐচ্ছিক (দেওয়া হয়নি)",
      generateBtn: "পিডিএফ প্যাকেজ তৈরি করুন",
      fixIssues: "বাধাগুলো দূর করে বাটনটি সচল করুন",
      blockingTitle: "শনাক্তকৃত সমস্যাসমূহ:"
    },
    preview: {
      title: "লাইভ প্রিভিউ",
      pageOf: "{total} পৃষ্ঠার মধ্যে {current}",
      coverTitle: "TENDER DOCUMENT PACKAGE",
      generatedOn: "প্যাকেজ তৈরির তারিখ",
      includedDocs: "সংযুক্ত ডকুমেন্টস তালিকা",
      emptyState: "লাইভ প্রিভিউ দেখতে রিকোয়ারমেন্ট লোড করে ফাইল ম্যাচ করুন"
    },
    buttons: {
      download: "প্যাকেজ ডাউনলোড",
      csvExport: "CSV চেকলিস্ট ডাউনলোড",
      autoMatch: "অটো-ম্যাচ",
      saveWork: "সংরক্ষণ করুন",
      loadWork: "লোড করুন",
      close: "বন্ধ করুন",
      cancel: "বাতিল",
      apply: "প্রয়োগ করুন",
      remove: "মুছুন",
      previewFile: "প্রিভিউ"
    },
    messages: {
      nonPdfRejected: "'{name}' বাতিল করা হয়েছে: এটি বৈধ পিডিএফ ফাইল নয়। অবশ্যই .pdf এক্সটেনশন এবং %PDF হেডার থাকতে হবে।",
      maxFilesExceeded: "সর্বোচ্চ সীমা অতিক্রম: আপনি সর্বোচ্চ ৩০টি পিডিএফ ফাইল (সর্বোচ্চ মোট ৫০ মেগাবাইট) আপলোড করতে পারবেন।",
      duplicateWarning: "সতর্কতা: '{name}'-এর কনটেন্ট (SHA-256) অন্য একটি ফাইলের সাথে হুবহু মিলে গেছে। এটি একাধিক ডকুমেন্টে ব্যবহার করা যাবে না।",
      alreadyMatched: "এই ফাইলটি ইতোমধ্যে অন্য একটি ডকুমেন্টে যুক্ত আছে।",
      passwordProtected: "সতর্কতা: '{name}' পাসওয়ার্ড সুরক্ষিত বা এনক্রিপ্ট করা। অনুগ্রহ করে সাধারণ পিডিএফ প্রদান করুন।",
      damagedFile: "ত্রুটি: '{name}' পড়া যায়নি। ফাইলটি ক্ষতিগ্রস্ত হতে পারে।",
      packageReady: "পিডিএফ প্যাকেজ সফলভাবে তৈরি হয়েছে!",
      savedSuccess: "কাজের অগ্রগতি ব্রাউজারে সংরক্ষিত হয়েছে।"
    }
  }
};
