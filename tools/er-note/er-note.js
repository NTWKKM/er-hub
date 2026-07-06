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

  window.copyNote = function(){
    const lines=[];
    document.querySelectorAll('.card').forEach(card=>{
      const title = card.querySelector('.section-title');
      if (!title) return;
      const section = title.textContent.trim();
      let has=false;
      const out=[];
      card.querySelectorAll('input,textarea,select').forEach(el=>{
        let label='';
        const lbl = el.closest('.field-row')?.querySelector('label');
        if (lbl) label = lbl.childNodes[0].textContent.trim();
        else label = el.getAttribute('data-label')||el.name||el.id;
        let val='';
        if (el.type==='radio'){ if(el.checked) val=el.parentNode.textContent.trim(); }
        else if (el.type==='checkbox'){ if(el.checked) val='✓ '+label; }
        else { val=el.value.trim(); }
        if (val) { out.push(label+': '+val); has=true; }
      });
      if (has) { lines.push('## '+section, ...out, ''); }
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