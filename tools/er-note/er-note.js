(function(){
  const form = document.getElementById('er-form');
  const storeKey = 'ernote-draft-'+(location.pathname.split('/').pop().replace('.html','')||'index');

  function loadDraft(){
    if (!form) return;
    try {
      const d = JSON.parse(localStorage.getItem(storeKey)||'{}');
      form.querySelectorAll('input,textarea,select').forEach(el=>{
        if (el.type==='radio'){ el.checked = (d[el.name]===el.value); }
        else if (el.type==='checkbox'){ el.checked = !!d[el.id || el.name]; }
        else { if (d[el.id||el.name]!=null) el.value = d[el.id||el.name]; }
      });
    } catch(e){}
  }

  function saveDraft(){
    if (!form) return;
    const d={};
    form.querySelectorAll('input,textarea,select').forEach(el=>{
      if (el.type==='radio'){ if(el.checked) d[el.name]=el.value; }
      else if (el.type==='checkbox'){ d[el.id||el.name]=el.checked; }
      else { d[el.id||el.name]=el.value; }
    });
    try { localStorage.setItem(storeKey, JSON.stringify(d)); } catch(e){}
  }

  if (form) {
    form.addEventListener('input', saveDraft);
    form.addEventListener('change', saveDraft);
  }

  // Generic row extraction: each .field-row (or .score-line) inside a .card becomes one output line.
  // .field-row containing a .checkbox-group/.radio-group -> "Label: checked1, checked2"
  // .field-row containing input/textarea/select -> "Label: value"
  // .score-line -> uses data-copy attribute verbatim (pre-formatted computed score text)
  function extractRow(row){
    if (row.classList.contains('score-line')){
      const val = (row.getAttribute('data-copy')||'').trim();
      return val || null;
    }
    const directLabel = row.querySelector(':scope > label');
    const label = directLabel ? (directLabel.childNodes[0].textContent||'').trim() : '';
    const group = row.querySelector('.checkbox-group, .radio-group');
    if (group){
      const checked = Array.from(group.querySelectorAll('input:checked'));
      if (!checked.length) return null;
      const vals = checked.map(inp=>{
        const lbl = inp.closest('label');
        return lbl ? lbl.textContent.trim() : (inp.value||'');
      });
      return (label||'—')+': '+vals.join(', ');
    }
    const el = row.querySelector('input,textarea,select');
    if (!el) return null;
    let val='';
    if (el.tagName==='SELECT'){ val = el.value ? (el.options[el.selectedIndex]?.text||'').trim() : ''; }
    else { val = el.value.trim(); }
    if (!val) return null;
    return (label||el.placeholder||el.id)+': '+val;
  }

  window.copyNote = function(){
    const lines=[];
    document.querySelectorAll('.card').forEach(card=>{
      const title = card.querySelector('.section-title');
      if (!title) return;
      const section = title.textContent.replace(/^\s*\d+\s*/,'').trim();
      const out=[];
      card.querySelectorAll('.field-row, .score-line').forEach(row=>{
        const line = extractRow(row);
        if (line) out.push(line);
      });
      if (out.length) lines.push('## '+section, ...out, '');
    });
    const text = lines.join('\n').trim() || '(no content)';
    navigator.clipboard.writeText(text).then(()=>{
      const btn=document.getElementById('copy-btn'); if(btn){ const t=btn.textContent; btn.textContent='คัดลอกแล้ว ✓'; setTimeout(()=>btn.textContent=t, 1200); }
    }).catch(()=>alert('คัดลอกไม่สำเร็จ กรุณาลองใหม่'));
  };

  window.clearNote = function(){
    if (!confirm('ล้างร่างทั้งหมด?')) return;
    if (form) form.reset();
    try { localStorage.removeItem(storeKey); } catch(e){}
  };

  window.printNote = function(){ window.print(); };

  const key = location.pathname.split('/').pop();
  document.querySelectorAll('.tab-bar a').forEach(a=>{
    if (a.getAttribute('href')===key) a.classList.add('active');
  });

  loadDraft();
})();