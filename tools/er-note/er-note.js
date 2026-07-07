(function(){
  'use strict';

  /* ===================================================================
   * ER NOTE — Schema v2 (multi-patient drafts)
   * Registry:  localStorage["ernote-registry"] = { version:2, drafts:[…] }
   * Per-draft: localStorage["ernote-draft-<template>-<id>"] = { …fields… }
   * Migration: old key "ernote-draft-<template>" → wrapped into registry
   * =================================================================== */

  var REGISTRY_KEY    = 'ernote-registry';
  var DRAFT_PREFIX    = 'ernote-draft-';
  var SCHEMA_VERSION  = 2;

  // Template name from filename (e.g. "sepsis", "general-er-note", "index")
  var templateName = (location.pathname.split('/').pop().replace(/\.html$/,'') || 'index');

  // CC field mapping per template — for sidebar card display
  // type: 'input' | 'textarea' | 'select'
  var CC_FIELDS = {
    'general-er-note': { type:'input',    id:'cc-text'         },
    'sepsis':           { type:'textarea', id:'narr-sepsis-hpi-free'    },
    'trauma':           { type:'select',   id:'trauma-mech'     },
    'chest-pain':       { type:'input',    id:'chest-onset'     },
    'abdominal-pain':   { type:'input',    id:'abdo-onset'      },
    'mammalian-bite':   { type:'input',    id:'narr-mammalian-bite-hpi-free' },
    'eye-injury':       { type:'input',    id:'eye-chemical'    },
    'index':            null
  };

  /* ---- Registry helpers ---- */
  function loadRegistry(){
    try {
      var r = JSON.parse(localStorage.getItem(REGISTRY_KEY) || '{}');
      if (r.version === SCHEMA_VERSION && Array.isArray(r.drafts)) return r;
    } catch(e){}
    return { version: SCHEMA_VERSION, drafts: [] };
  }

  function saveRegistry(reg){
    try { localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg)); } catch(e){}
  }

  function genId(){
    return 'd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
  }

  function draftKey(template, id){
    return DRAFT_PREFIX + template + '-' + id;
  }

  /* ---- Migration from v1 (single draft per template) ---- */
  function migrateV1(){
    var reg = loadRegistry();
    var oldKeys = [];
    for (var i = 0; i < localStorage.length; i++){
      var key = localStorage.key(i);
      if (!key || key.indexOf(DRAFT_PREFIX) !== 0) continue;
      var rest = key.slice(DRAFT_PREFIX.length);
      // New format: <template>-d_<alphanum>  → skip
      if (/-d_[a-z0-9_]+$/.test(rest)) continue;
      oldKeys.push({ key:key, template:rest });
    }
    if (!oldKeys.length) return;

    for (var j = 0; j < oldKeys.length; j++){
      var entry = oldKeys[j];
      try {
        var data = JSON.parse(localStorage.getItem(entry.key) || '{}');
        var id = genId();
        var hn = data['ernote-hn'] || '';
        var ccInfo = CC_FIELDS[entry.template];
        var cc = '';
        if (ccInfo && data[ccInfo.id]) cc = String(data[ccInfo.id]).slice(0, 80);
        reg.drafts.push({ id:id, template:entry.template, hn:hn, cc:cc, updatedAt:Date.now() });
        localStorage.setItem(draftKey(entry.template, id), JSON.stringify(data));
        localStorage.removeItem(entry.key);
      } catch(e){}
    }
    saveRegistry(reg);
  }

  /* ---- Draft CRUD ---- */
  function createDraft(template, id){
    var reg = loadRegistry();
    reg.drafts.push({ id:id, template:template, hn:'', cc:'', updatedAt:Date.now() });
    saveRegistry(reg);
    try { localStorage.setItem(draftKey(template, id), '{}'); } catch(e){}
  }

  function updateDraftMeta(template, id, hn, cc){
    var reg = loadRegistry();
    var entry = null;
    for (var i = 0; i < reg.drafts.length; i++){
      if (reg.drafts[i].id === id && reg.drafts[i].template === template){ entry = reg.drafts[i]; break; }
    }
    if (entry){
        entry.hn = hn;
        entry.cc = cc;
      entry.updatedAt = Date.now();
      saveRegistry(reg);
    }
  }

  function deleteDraft(template, id){
    var reg = loadRegistry();
    reg.drafts = reg.drafts.filter(function(d){ return !(d.id === id && d.template === template); });
    saveRegistry(reg);
    try { localStorage.removeItem(draftKey(template, id)); } catch(e){}
  }

  /* ---- CC / HN extraction ---- */
  function getCCValue(){
    var info = CC_FIELDS[templateName];
    if (!info) return '';
    if (info.type === 'radio'){
      var checked = document.querySelector('input[name="'+info.id+'"]:checked');
      return checked ? checked.value : '';
    }
    var el = document.getElementById(info.id);
    if (!el) return '';
    if (info.type === 'select') return el.value ? (el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '') : '';
    return (el.value || '').trim();
  }

  function getHNValue(){
    var el = document.getElementById('ernote-hn');
    return el ? (el.value || '').trim() : '';
  }

  /* ---- Form persistence ---- */
  var form = document.getElementById('er-form');
  var currentDraftId = null;
  var isIndex = (templateName === 'index');

  // Read ?draft=<id> from URL
  (function readDraftParam(){
    var params = new URLSearchParams(location.search);
    var d = params.get('draft');
    if (d) currentDraftId = d;
  })();

  function loadDraft(){
    if (!form || !currentDraftId) return;
    try {
      var d = JSON.parse(localStorage.getItem(draftKey(templateName, currentDraftId)) || '{}');
      form.querySelectorAll('input,textarea,select').forEach(function(el){
        if (el.type === 'radio'){ el.checked = (d[el.name] === el.value); }
        else if (el.type === 'checkbox'){ el.checked = !!d[el.id || el.name]; }
        else { if (d[el.id || el.name] != null) el.value = d[el.id || el.name]; }
      });
    } catch(e){}
  }

  function draftInRegistry(template, id){
    var reg = loadRegistry();
    return reg.drafts.some(function(d){ return d.id === id && d.template === template; });
  }

  function saveDraft(){
    if (!form || isIndex) return;

    // Lazy-create: no draft ID, or ID no longer tracked in the registry → (re)create
    if (!currentDraftId || !draftInRegistry(templateName, currentDraftId)){
      currentDraftId = genId();
      createDraft(templateName, currentDraftId);
      var url = new URL(location.href);
      url.searchParams.set('draft', currentDraftId);
      history.replaceState(null, '', url);
    }

    var d = {};
    form.querySelectorAll('input,textarea,select').forEach(function(el){
      if (el.type === 'radio'){ if (el.checked) d[el.name] = el.value; }
      else if (el.type === 'checkbox'){ d[el.id || el.name] = el.checked; }
      else { d[el.id || el.name] = el.value; }
    });
    try { localStorage.setItem(draftKey(templateName, currentDraftId), JSON.stringify(d)); } catch(e){}

    updateDraftMeta(templateName, currentDraftId, getHNValue(), getCCValue());

    if (window.ErNoteSidebar && typeof window.ErNoteSidebar.refresh === 'function'){
      window.ErNoteSidebar.refresh();
    }
  }

  if (form){
    form.addEventListener('input', saveDraft);
    form.addEventListener('change', saveDraft);
  }

  /* ---- Row extraction (unchanged — works for v2 because patient-strip
   * is NOT inside a .card, so copyNote skips it) ---- */
  function extractRow(row){
    if (row.classList.contains('score-line')){
      var val = (row.getAttribute('data-copy') || '').trim();
      return val || null;
    }
    var directLabel = row.querySelector(':scope > label');
    var label = directLabel ? (directLabel.childNodes[0].textContent || '').trim() : '';
    var group = row.querySelector('.checkbox-group, .radio-group, .btn-group');
    if (group){
      var checked = Array.from(group.querySelectorAll('input:checked'));
      if (!checked.length) return null;
      var vals = checked.map(function(inp){
        var lbl = inp.closest('label');
        if (!lbl) return (inp.value || '');
        // For btn-group tiles, prefer .tile-label text (avoids SVG/emoji noise)
        var tileLabel = lbl.querySelector('.tile-label');
        if (tileLabel) return tileLabel.textContent.trim();
        return lbl.textContent.trim();
      });
      return (label || '—') + ': ' + vals.join(', ');
    }
    var el = row.querySelector('input,textarea,select');
    if (!el) return null;
    var val2 = '';
    if (el.tagName === 'SELECT'){ val2 = el.value ? (el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '').trim() : ''; }
    else { val2 = el.value.trim(); }
    if (!val2) return null;
    return (label || el.placeholder || el.id) + ': ' + val2;
  }

  window.copyNote = function(){
    var lines = [];
    // Include HN from patient strip (not inside a .card)
    var hn = getHNValue();
    if (hn) lines.push('HN: ' + hn, '');
    document.querySelectorAll('.card').forEach(function(card){
      var title = card.querySelector('.section-title');
      if (!title) return;
      var section = title.textContent.replace(/^\s*\d+\s*/, '').trim();
      var out = [];
      card.querySelectorAll('.field-row, .score-line').forEach(function(row){
        var line = extractRow(row);
        if (line) out.push(line);
      });
      if (out.length) lines.push('## ' + section, ...out, '');
    });
    var text = lines.join('\n').trim() || '(no content)';
    navigator.clipboard.writeText(text).then(function(){
      var btn = document.getElementById('copy-btn');
      if (btn){ var t = btn.textContent; btn.textContent = 'คัดลอกแล้ว ✓'; setTimeout(function(){ btn.textContent = t; }, 1200); }
    }).catch(function(){ alert('คัดลอกไม่สำเร็จ กรุณาลองใหม่'); });
  };

  window.clearNote = function(){
    if (!confirm('ล้างร่างทั้งหมด?')) return;
    if (form) form.reset();
    if (currentDraftId){
      deleteDraft(templateName, currentDraftId);
      currentDraftId = null;
      var url = new URL(location.href);
      url.searchParams.delete('draft');
      history.replaceState(null, '', url);
    }
    if (window.ErNoteSidebar && typeof window.ErNoteSidebar.refresh === 'function'){
      window.ErNoteSidebar.refresh();
    }
  };

  window.printNote = function(){ window.print(); };

  /* ---- Tab bar active state ---- */
  var pageKey = location.pathname.split('/').pop();
  document.querySelectorAll('.tab-bar a').forEach(function(a){
    if (a.getAttribute('href') === pageKey) a.classList.add('active');
  });

  /* ---- Init ---- */
  migrateV1();
  // Defer loadDraft so inline template scripts can render IX/TX containers first
  setTimeout(loadDraft, 0);

  /* ---- Public API (for sidebar + investigation/treatment modules) ---- */
  window.ErNote = {
    templateName: templateName,
    CC_FIELDS: CC_FIELDS,
    registry: {
      load: loadRegistry,
      save: saveRegistry,
      createDraft: createDraft,
      deleteDraft: deleteDraft,
      genId: genId,
      draftKey: draftKey
    },
    getCurrentDraftId: function(){ return currentDraftId; },
    getHN: getHNValue,
    getCC: getCCValue,
    saveDraft: saveDraft,

    // ---- Investigation / Treatment render helpers (P3/P4) ----
    renderCheckboxGroup: function(container, items, groupId){
      if (!container) return;
      var html = '<div class="checkbox-group" id="' + groupId + '">';
      items.forEach(function(item){
        var id = groupId + '-' + item.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        html += '<label><input type="checkbox" id="' + id + '">' + item + '</label>';
      });
      html += '</div>';
      container.innerHTML = html;
    },

    /* ---- Investigation presets ----
     * Each: { labs:[...], imaging:[...] }
     * Labs include optional items (Ca, Mg, PO4) in all templates
     */
    INVESTIGATION_PRESETS: {
      'general-er-note': {
        labs: ['CBC','BUN/Cr/Electrolyte','LFT','UA','Ca','Mg','PO4'],
        imaging: ['CXR','ECG']
      },
      'sepsis': {
        labs: ['CBC','BUN/Cr/Electrolyte','LFT','Lactate','H/C x 2','Urine C/S','UA','Coag','Ca','Mg','PO4'],
        imaging: ['CXR','ECG']
      },
      'chest-pain': {
        labs: ['Troponin','CBC','BUN/Cr/Electrolyte','Coag','Ca','Mg','PO4'],
        imaging: ['ECG','CXR']
      },
      'abdominal-pain': {
        labs: ['CBC','BUN/Cr/Electrolyte','LFT','Lipase','Amylase','UA','β-hCG','Ca','Mg','PO4'],
        imaging: ['US abdomen','CT abdomen','AAS']
      },
      'trauma': {
        labs: ['CBC','Coag','Type & screen','VBG/ABG','Ca','Mg','PO4'],
        imaging: ['FAST US','CXR','Pelvis X-ray','CT (specify)']
      },
      'mammalian-bite': {
        labs: ['CBC','Ca','Mg','PO4'],
        imaging: []
      },
      'eye-injury': {
        labs: [],
        imaging: []
      }
    },

    /* ---- Treatment presets ----
     * Each: { checks:[...], freeText:true }
     * Templates with clinical-protocol-specific fields (sepsis, mammalian-bite)
     * keep existing fields — only supportive treatment checkboxes added
     */
    TREATMENT_PRESETS: {
      'general-er-note': {
        checks: ['Analgesia','Antiemetic','IV fluid','O2 therapy','Wound care','Splint/Immobilize'],
        freeText: true
      },
      'sepsis': {
        checks: [],
        freeText: false  // sepsis already has ABx/fluid/vasopressor fields
      },
      'chest-pain': {
        checks: ['Aspirin given','Nitrate given','Anticoagulation started','O2 if hypoxic','Beta-blocker','High-intensity statin'],
        freeText: true
      },
      'abdominal-pain': {
        checks: ['Analgesia','Antiemetic','NPO','IV fluid','Surgical consult'],
        freeText: true
      },
      'trauma': {
        checks: ['IV fluid/blood product','Tetanus given','Analgesia','Splint/Immobilize','Wound care'],
        freeText: true
      },
      'mammalian-bite': {
        checks: [],  // already has Rabies PEP + Tetanus fields
        freeText: true
      },
      'eye-injury': {
        checks: ['Topical antibiotic','Cycloplegic','Eye shield','Irrigation (chemical)'],
        freeText: true
      }
    },

    renderInvestigation: function(container, template){
      if (!container) return;
      var preset = this.INVESTIGATION_PRESETS[template];
      if (!preset) return;
      var tpl = template;
      var html = '';

      if (preset.labs.length){
        html += '<div class="field-row"><label>Labs</label>';
        html += '<div class="checkbox-group" id="ix-' + tpl + '-labs">';
        preset.labs.forEach(function(item){
          var id = 'ix-' + tpl + '-labs-' + item.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          html += '<label><input type="checkbox" id="' + id + '">' + item + '</label>';
        });
        html += '</div></div>';
      }

      if (preset.imaging.length){
        html += '<div class="field-row"><label>Imaging</label>';
        html += '<div class="checkbox-group" id="ix-' + tpl + '-imaging">';
        preset.imaging.forEach(function(item){
          var id = 'ix-' + tpl + '-imaging-' + item.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          html += '<label><input type="checkbox" id="' + id + '">' + item + '</label>';
        });
        html += '</div></div>';
      }

      html += '<div class="field-row"><label>Investigation (free text)</label>';
      html += '<input type="text" id="ix-' + tpl + '-free" placeholder="แลบ/ฟิล์มอื่นๆ นอกเหนือจากด้านบน"></div>';

      container.innerHTML = html;
    },

    renderTreatment: function(container, template){
      if (!container) return;
      var preset = this.TREATMENT_PRESETS[template];
      if (!preset) return;
      var tpl = template;
      var html = '';

      if (preset.checks.length){
        html += '<div class="field-row"><label>Treatment given</label>';
        html += '<div class="checkbox-group" id="tx-' + tpl + '-checks">';
        preset.checks.forEach(function(item){
          var id = 'tx-' + tpl + '-checks-' + item.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          html += '<label><input type="checkbox" id="' + id + '">' + item + '</label>';
        });
        html += '</div></div>';
      }

      if (preset.freeText){
        html += '<div class="field-row"><label>Treatment (free text)</label>';
        html += '<textarea id="tx-' + tpl + '-free" placeholder="เพิ่มเติม/รายละเอียดที่ checkbox ไม่ครอบคลุม"></textarea></div>';
      }

      container.innerHTML = html;
    },

    /* ---- Narrative presets ----
     * Each: { hpi, pmh, allergies, pe }
     * hpi/pmh/allergies/pe each: { title, placeholder, checkboxes:[], freeText:bool, autoFocus:bool }
     * freeText adds a textarea; autoFocus focuses the first input on render.
     * Templates use these sections as their HPI / PMH / Allergies / PE.
     */
    NARRATIVE_PRESETS: {
      'general-er-note': {
        hpi: { title: 'HPI', placeholder: 'OPQRST / SAMPLE…', checkboxes: [], freeText: true, autoFocus: false },
        pmh: { title: 'PMH', placeholder: 'ระบุโรคประจำตัว…', checkboxes: [], freeText: true, autoFocus: false },
        allergies: { title: 'Allergies', placeholder: 'ระบุ allergy…', checkboxes: ['NKDA', 'Unknown'], freeText: true, autoFocus: false },
        pe: { title: 'PE', placeholder: 'ระบุ physical exam…', checkboxes: [], freeText: true, autoFocus: false }
      },
      'sepsis': {
        // HPI focuses on infection onset and progression
        hpi: {
          title: 'HPI — Infection Onset & Progression',
          placeholder: 'Onset / progression: when did symptoms start, how did they evolve, triggers…',
          checkboxes: ['Community-acquired', 'Healthcare-associated', 'Nosocomial'],
          freeText: true, autoFocus: true
        },
        // PMH adds sepsis-relevant risk factors
        pmh: {
          title: 'PMH & Risk Factors',
          placeholder: 'ระบุโรคประจำตัว + risk factors…',
          checkboxes: ['DM', 'CKD', 'Malignancy', 'Steroid/immunosuppressant', 'None'],
          freeText: true, autoFocus: false
        },
        allergies: {
          title: 'Allergies & Drug Intolerances',
          placeholder: 'ระบุ allergy รวมถึง drug intolerances…',
          checkboxes: ['NKDA', 'Unknown', 'Penicillin allergy (verify)'],
          freeText: true, autoFocus: false
        },
        pe: {
          title: 'PE — Systemic & Focused',
          placeholder: 'Vital signs, general appearance, focused exam…',
          checkboxes: ['Alert', 'Confused / AVPU', 'Febrile', 'Hypothermic', 'Tachycardic', 'Hypotensive'],
          freeText: true, autoFocus: false
        }
      },
      'mammalian-bite': {
        // HPI focuses on animal exposure and bite circumstances
        hpi: {
          title: 'HPI — Animal Exposure & Bite Circumstances',
          placeholder: 'Animal type, provocation, date/time, location on body…',
          checkboxes: ['Provoked', 'Unprovoked', 'Unknown'],
          freeText: true, autoFocus: true
        },
        pmh: {
          title: 'PMH & Tetanus History',
          placeholder: 'ระบุโรคประจำตัว + tetanus history…',
          checkboxes: ['Immunocompetent', 'Immunocompromised', 'Splenectomy', 'CKD/Dialysis'],
          freeText: true, autoFocus: false
        },
        allergies: {
          title: 'Allergies',
          placeholder: 'ระบุ allergy (especially antibiotics planned for prophylaxis)…',
          checkboxes: ['NKDA', 'Unknown', 'Penicillin allergy'],
          freeText: true, autoFocus: false
        },
        pe: {
          title: 'PE — Wound & Systemic',
          placeholder: 'Wound description, neurovascular status, regional lymph nodes…',
          checkboxes: ['Wound irrigated ≥15 min', 'Neurovascular intact', 'Lymphadenopathy', 'No signs of infection'],
          freeText: true, autoFocus: false
        }
      },
      'chest-pain': {
        hpi: { title: 'HPI — Chest Pain Onset', placeholder: 'Onset, character, radiation, severity, provocative factors…', checkboxes: ['Cardiac risk factors: DM', 'Cardiac risk factors: HTN', 'Cardiac risk factors: smoking', 'Cardiac risk factors: family history', 'Recent chest trauma'], freeText: true, autoFocus: true },
        pmh: { title: 'PMH & Cardiac History', placeholder: 'ระบุโรคประจำตัว + cardiac history…', checkboxes: ['CAD/ACS history', 'Prior PCI/CABG', 'HF', 'Arrhythmia', 'None'], freeText: true, autoFocus: false },
        allergies: { title: 'Allergies', placeholder: 'ระบุ allergy…', checkboxes: ['NKDA', 'Unknown', 'Aspirin allergy', 'Heparin-induced thrombocytopenia'], freeText: true, autoFocus: false },
        pe: { title: 'PE — Cardiovascular & Pulmonary', placeholder: 'Vitals, cardiovascular exam, lung fields…', checkboxes: ['Regular rhythm', 'Murmur present', 'Clear lung fields', 'No leg swelling'], freeText: true, autoFocus: false }
      },
      'abdominal-pain': {
        hpi: { title: 'HPI — Abdominal Pain', placeholder: 'Onset, location, migration, character, severity, aggravating/relieving factors…', checkboxes: ['Nausea/vomiting', 'Diarrhea', 'Constipation', 'Bloating', 'Recent dietary change'], freeText: true, autoFocus: true },
        pmh: { title: 'PMH & Surgical History', placeholder: 'ระบุโรคประจำตัว + surgical history…', checkboxes: ['Prior abdominal surgery', 'IBD', 'Gallbladder disease', 'Hernia'], freeText: true, autoFocus: false },
        allergies: { title: 'Allergies', placeholder: 'ระบุ allergy…', checkboxes: ['NKDA', 'Unknown'], freeText: true, autoFocus: false },
        pe: { title: 'PE — Abdomen & Systemic', placeholder: 'Inspection, palpation, auscultation, rebound/guarding, masses…', checkboxes: ['Soft, non-tender', 'Guarding', 'Rebound tenderness', 'Mass palpable', 'Normal bowel sounds'], freeText: true, autoFocus: false }
      },
      'trauma': {
        hpi: { title: 'HPI — Mechanism of Injury', placeholder: 'RTA details, fall height, assault weapon, time of injury…', checkboxes: ['Loss of consciousness', 'Seizure at scene', 'Amnesia'], freeText: true, autoFocus: true },
        pmh: { title: 'PMH & Medications', placeholder: 'ระบุโรคประจำตัว + medications that affect bleeding/clotting…', checkboxes: ['Anticoagulant/antiplatelet', 'Bleeding disorder'], freeText: true, autoFocus: false },
        allergies: { title: 'Allergies', placeholder: 'ระบุ allergy…', checkboxes: ['NKDA', 'Unknown'], freeText: true, autoFocus: false },
        pe: { title: 'PE — Primary & Secondary Survey Findings', placeholder: 'xABCDE findings, injuries identified…', checkboxes: ['GCS 15', 'Pupils equal and reactive', 'No midline neck tenderness', 'No chest tenderness', 'No abdominal tenderness', 'No pelvic instability'], freeText: true, autoFocus: false }
      },
      'eye-injury': {
        hpi: { title: 'HPI — Eye Injury', placeholder: 'Mechanism, time, symptoms (pain, vision change, foreign body sensation)…', checkboxes: ['Chemical exposure', 'Thermal injury', 'Blunt trauma', 'Penetrating injury suspected'], freeText: true, autoFocus: true },
        pmh: { title: 'PMH & Ophthalmologic History', placeholder: 'ระบุโรคประจำตัว + eye surgery/history…', checkboxes: ['Contact lens wearer', 'Prior eye surgery', 'Glaucoma', 'None'], freeText: true, autoFocus: false },
        allergies: { title: 'Allergies', placeholder: 'ระบุ allergy (especially topical agents)…', checkboxes: ['NKDA', 'Unknown'], freeText: true, autoFocus: false },
        pe: { title: 'PE — Eye Exam', placeholder: 'Visual acuity, pupil, slit-lamp findings, IOP if measured…', checkboxes: ['Visual acuity documented', 'Pupil round reactive', 'No afferent pupillary defect', 'Cornea clear', 'No hyphema'], freeText: true, autoFocus: false }
      }
    },

    /* ---- Render narrative section (HPI / PMH / Allergies / PE) ----
     * Injects 4 sub-cards into container, one per subsection.
     * Each subsection: title + optional checkboxes + textarea (if freeText).
     */
    renderNarrative: function(container, template){
      if (!container) return;
      var preset = this.NARRATIVE_PRESETS[template];
      if (!preset) return;

      var subsections = ['hpi', 'pmh', 'allergies', 'pe'];
      var subTitles = { hpi: 'HPI', pmh: 'PMH', allergies: 'Allergies', pe: 'PE' };
      var html = '';

      subsections.forEach(function(key){
        var sec = preset[key];
        if (!sec) return;
        var safeId = 'narr-' + template + '-' + key;
        html += '<div class="card narrative-sub-card">';
        html += '<h3 class="section-title"><span class="num">—</span>' + sec.title + '</h3>';

        if (sec.checkboxes && sec.checkboxes.length){
          html += '<div class="field-row"><label>' + subTitles[key] + ' checklist</label>';
          html += '<div class="checkbox-group" id="' + safeId + '-checks">';
          sec.checkboxes.forEach(function(item){
            var cbId = safeId + '-cb-' + item.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            html += '<label><input type="checkbox" id="' + cbId + '">' + item + '</label>';
          });
          html += '</div></div>';
        }

        if (sec.freeText){
          html += '<div class="field-row"><label>' + subTitles[key] + ' detail</label>';
          html += '<textarea id="' + safeId + '-free" placeholder="' + sec.placeholder + '"></textarea></div>';
        } else {
          html += '<div class="field-row"><label>' + subTitles[key] + ' detail</label>';
          html += '<input type="text" id="' + safeId + '-free" placeholder="' + sec.placeholder + '"></div>';
        }

        html += '</div>\n';
      });

      container.innerHTML = html;

      if (preset.hpi && preset.hpi.autoFocus){
        var first = document.getElementById('narr-' + template + '-hpi-free');
        if (first) first.focus();
      }
    }
  };

  /* ===================================================================
   * SIDEBAR — Floating draft manager
   * =================================================================== */
  var TEMPLATE_LABELS = {
    'general-er-note':'General',
    'sepsis':'Sepsis',
    'trauma':'Trauma',
    'mammalian-bite':'Bite',
    'chest-pain':'Chest Pain',
    'abdominal-pain':'Abdo Pain',
    'eye-injury':'Eye'
  };
  var TEMPLATE_FILES = {
    'general-er-note':'general-er-note.html',
    'sepsis':'sepsis.html',
    'trauma':'trauma.html',
    'mammalian-bite':'mammalian-bite.html',
    'chest-pain':'chest-pain.html',
    'abdominal-pain':'abdominal-pain.html',
    'eye-injury':'eye-injury.html'
  };

  function relTime(ts){
    var diff = Date.now() - ts;
    var s = Math.floor(diff/1000);
    if (s < 60) return s + ' วินาทีที่แล้ว';
    var m = Math.floor(s/60);
    if (m < 60) return m + ' นาทีที่แล้ว';
    var h = Math.floor(m/60);
    if (h < 24) return h + ' ชม.ที่แล้ว';
    var d = Math.floor(h/24);
    return d + ' วันที่แล้ว';
  }

  function buildSidebar(){
    // FAB
    var fab = document.createElement('button');
    fab.className = 'sidebar-fab';
    fab.innerHTML = '☰';
    fab.title = 'Drafts';
    fab.addEventListener('click', togglePanel);
    document.body.appendChild(fab);

    // Panel
    var panel = document.createElement('div');
    panel.className = 'sidebar-panel';
    panel.id = 'sidebar-panel';
    panel.innerHTML =
      '<div class="sidebar-header">' +
        '<h3>Patient Drafts</h3>' +
        '<button class="sidebar-close" title="Close">&times;</button>' +
      '</div>' +
      '<button class="sidebar-new">+ New Draft (this template)</button>' +
      '<div class="sidebar-filter"><input type="text" placeholder="ค้นหา HN หรือ CC..." id="sidebar-search"></div>' +
      '<div class="sidebar-list" id="sidebar-list"></div>';
    document.body.appendChild(panel);

    panel.querySelector('.sidebar-close').addEventListener('click', closePanel);
    panel.querySelector('.sidebar-new').addEventListener('click', newCurrentTemplate);
    var search = panel.querySelector('#sidebar-search');
    search.addEventListener('input', refresh);
  }

  function togglePanel(){
    var panel = document.getElementById('sidebar-panel');
    if (panel) panel.classList.toggle('open');
  }
  function closePanel(){
    var panel = document.getElementById('sidebar-panel');
    if (panel) panel.classList.remove('open');
  }

  function newCurrentTemplate(){
    if (templateName === 'index') return;
    var id = window.ErNote.registry.genId();
    window.ErNote.registry.createDraft(templateName, id);
    location.href = TEMPLATE_FILES[templateName] + '?draft=' + id;
  }

  function refresh(){
    var list = document.getElementById('sidebar-list');
    if (!list) return;
    var reg = window.ErNote.registry.load();
    var drafts = reg.drafts.slice().sort(function(a,b){ return b.updatedAt - a.updatedAt; });
    var query = '';
    var search = document.getElementById('sidebar-search');
    if (search) query = search.value.toLowerCase().trim();
    if (query){
      drafts = drafts.filter(function(d){
        return (d.hn || '').toLowerCase().indexOf(query) !== -1 ||
               (d.cc || '').toLowerCase().indexOf(query) !== -1;
      });
    }
    if (!drafts.length){
      list.innerHTML = '<div class="sidebar-empty">' + (query ? 'ไม่พบ draft ที่ตรง' : 'ยังไม่มี draft — พิมพ์ HN แล้วเริ่ม note') + '</div>';
      return;
    }
    function escapeHtml(str){
      return String(str == null ? '' : str).replace(/[&<>"']/g, function(ch){
        return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
      });
    }
    list.innerHTML = drafts.map(function(d){
      var label = TEMPLATE_LABELS[d.template] || d.template;
      var ccTrunc = escapeHtml((d.cc || '(no CC)').slice(0, 40));
      var hn = escapeHtml(d.hn || '(no HN)');
      var tpl = escapeHtml(d.template);
      var id = escapeHtml(d.id);
      return '<div class="sidebar-card tpl-' + tpl + '" data-id="' + id + '" data-template="' + tpl + '">' +
        '<div class="sidebar-card-info">' +
          '<div class="sidebar-card-hn">' + hn + '</div>' +
          '<div class="sidebar-card-cc">' + ccTrunc + '</div>' +
          '<div class="sidebar-card-meta">' + relTime(d.updatedAt) + ' · <span class="sidebar-card-template">' + label + '</span></div>' +
        '</div>' +
        '<button class="sidebar-card-delete" data-id="' + d.id + '" data-template="' + d.template + '" title="ลบ">&times;</button>' +
      '</div>';
    }).join('');
    // Wire click handlers
    list.querySelectorAll('.sidebar-card').forEach(function(card){
      card.addEventListener('click', function(e){
        if (e.target.classList.contains('sidebar-card-delete')) return;
        var id = card.getAttribute('data-id');
        var tpl = card.getAttribute('data-template');
        location.href = TEMPLATE_FILES[tpl] + '?draft=' + id;
      });
    });
    list.querySelectorAll('.sidebar-card-delete').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        var tpl = btn.getAttribute('data-template');
        if (!confirm('ลบ draft ' + (TEMPLATE_LABELS[tpl]||tpl) + ' — HN: ' + (window.ErNote.registry.load().drafts.find(function(d){return d.id===id;})||{}).hn + '?')) return;
        window.ErNote.registry.deleteDraft(tpl, id);
        refresh();
      });
    });
  }

  window.ErNoteSidebar = { refresh: refresh };
  buildSidebar();

})();