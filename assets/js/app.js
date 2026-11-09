(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const periodos = window.CurriculoPeriodos;
  const empty = () => ({
    name:'', email:'', phone:'', city:'', link:'', objective:'', summary:'', skills:'', courses:'',
    experiences:[], education:[]
  });
  let state = empty();
  let toastTimer;
  let printHintShown = false;

  function toast(message) {
    const element = $('toast');
    element.textContent = message;
    element.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { element.hidden = true; }, 4500);
  }
  function showScreen(which) {
    $('screen-home').hidden = which !== 'home';
    $('screen-app').hidden = which !== 'app';
    window.scrollTo({top:0,behavior:'instant'});
  }
  function selectTab(which) {
    for (const name of ['edit','import','review']) {
      $('panel-' + name).hidden = name !== which;
      $('tab-' + name).classList.toggle('active', name === which);
      $('tab-' + name).setAttribute('aria-selected', String(name === which));
    }
    if (which === 'review') renderReview();
  }
  function text(el, value) { el.textContent = value || ''; }
  // Never put demonstration text or field labels in the actual resume.
  // Empty fields remain available in the form, but disappear from preview and PDF.
  function optionalPreview(el, value) {
    const cleanValue = String(value || '').trim();
    text(el, cleanValue);
    el.hidden = cleanValue.length === 0;
  }
  function appendEntry(parent, title, meta, description) {
    const wrap = document.createElement('div');
    wrap.className = 'resume-entry';
    if (title) { const h = document.createElement('h4'); text(h,title); wrap.append(h); }
    if (meta) { const p = document.createElement('p'); p.className='entry-meta'; text(p,meta); wrap.append(p); }
    if (description) { const p = document.createElement('p'); p.className='entry-description'; text(p,description); wrap.append(p); }
    parent.append(wrap);
  }
  const hasEntry = item => Object.values(item).some(v => typeof v === 'string' ? !!v.trim() : !!v);
  function renderPreview() {
    optionalPreview($('pv-name'), state.name);
    optionalPreview($('pv-objective'), state.objective);
    const contacts = [state.email,state.phone,state.city,state.link]
      .map(value => value.trim()).filter(Boolean);
    optionalPreview($('pv-contact'), contacts.join('  •  '));
    $('resume-preview').querySelector('.resume-top').hidden =
      !state.name.trim() && !state.objective.trim() && contacts.length === 0;
    optionalPreview($('pv-summary'), state.summary);
    $('pv-summary-wrap').hidden = !state.summary.trim();
    const exp = state.experiences.filter(hasEntry);
    $('pv-exp-wrap').hidden = exp.length === 0;
    $('pv-experiences').replaceChildren();
    exp.forEach(item => appendEntry($('pv-experiences'),item.role,[item.company,periodos.label(item,'experiences')].filter(Boolean).join('  •  '),item.description));
    const edu = state.education.filter(hasEntry);
    $('pv-education-wrap').hidden = edu.length === 0;
    $('pv-education').replaceChildren();
    edu.forEach(item => appendEntry($('pv-education'),item.course,[item.institution,periodos.label(item,'education')].filter(Boolean).join('  •  '),item.description||''));
    $('pv-skills-wrap').hidden = !state.skills.trim();
    text($('pv-skills'), state.skills.split(/[,;\n]/).map(v=>v.trim()).filter(Boolean).join('  •  '));
    $('pv-courses-wrap').hidden = !state.courses.trim();
    const coursesEl=$('pv-courses');coursesEl.replaceChildren();
    state.courses.split(/\n+/).map(line=>line.trim()).filter(Boolean).forEach(line=>{
      const row=document.createElement('div');row.className='course-entry';
      const pieces=line.split(/\s+[—–]\s+/).map(v=>v.trim()).filter(Boolean);
      const title=document.createElement('strong');title.className='course-name';title.textContent=pieces.shift()||line;row.append(title);
      if(pieces.length){const detail=document.createElement('p');detail.className='course-detail';detail.textContent=pieces.join(' • ');row.append(detail);}
      coursesEl.append(row);
    });
  }
  function dataFields() {
    return ['name','email','phone','city','link','objective','summary','skills','courses'];
  }
  function syncBaseFields() {
    for (const field of dataFields()) $('field-'+field).value = state[field];
  }
  function field(labelText,key,value,container,multiline=false,placeholderText='') {
    const lab = document.createElement('label');
    lab.className = 'field';
    lab.textContent = labelText;
    const input = document.createElement(multiline?'textarea':'input');
    if(multiline) { input.rows=3; } else { input.type='text'; }
    input.value = value;
    input.placeholder = placeholderText;
    input.dataset.key = key;
    input.addEventListener('input',()=>{
      const type = container.dataset.type;
      const idx = Number(container.dataset.index);
      state[type][idx][key] = input.value;
      renderPreview();
    });
    lab.append(input);
    return lab;
  }
  // Campos de mês/ano substituem períodos livres no editor. Os períodos antigos
  // são preservados em aviso de conferência quando não é seguro convertê-los.
  function monthField(label,key,item,container) {
    const lab=document.createElement('label');
    lab.className='field';lab.textContent=label;
    const input=document.createElement('input');
    input.type='month';input.lang='pt-BR';input.dataset.key=key;
    input.setAttribute('aria-label',label+' (mês e ano)');
    input.value=item[key]||'';
    input.addEventListener('input',()=>{
      const rec=state[container.dataset.type][Number(container.dataset.index)];
      rec[key]=input.value;
      if(input.value)rec.period='';
      renderPreview();
      updatePeriodMessage(container,rec);
    });
    lab.append(input);
    return lab;
  }
  function updatePeriodMessage(card,item){
    const message=card.querySelector('.period-import-warning');
    const conflict=card.querySelector('.period-order-warning');
    if(message){
      const original=item.originalPeriod||item.period||'';
      const complete=!!(item.startDate && (item.endDate||item.ongoing)) ||
        (card.closest('[data-type]')?.dataset.type==='education' && !!item.endDate);
      message.hidden=!original||complete;
      message.textContent=(!message.hidden)?
        `Período original para conferência: “${original}”. Confira os meses e anos nos campos acima antes de salvar.`:'';
    }
    if(conflict)conflict.hidden=!periodos.backwards(item);
  }
  function periodInputs(type,item,card){
    const wrap=document.createElement('div');wrap.className='period-inputs';
    const dates=document.createElement('div');dates.className='fields-grid two';
    dates.append(monthField('Início (mês/ano)','startDate',item,card));
    const final=monthField(type==='education'?'Conclusão ou previsão (mês/ano)':'Término (mês/ano)','endDate',item,card);
    dates.append(final);wrap.append(dates);
    const checkbox=document.createElement('label');checkbox.className='ongoing-toggle';
    const check=document.createElement('input');check.type='checkbox';check.dataset.key='ongoing';
    check.checked=!!item.ongoing;
    check.setAttribute('aria-label',type==='education'?'Formação em andamento':'Trabalho atual');
    const span=document.createElement('span');span.textContent=type==='education'?'Ainda estou cursando':'Trabalho aqui atualmente';
    checkbox.append(check,span);wrap.append(checkbox);
    const endInput=final.querySelector('input');
    const applyDisabled=()=>{endInput.disabled=check.checked;final.classList.toggle('field-disabled',check.checked);};
    applyDisabled();
    check.addEventListener('change',()=>{
      const rec=state[card.dataset.type][Number(card.dataset.index)];
      rec.ongoing=check.checked;
      if(check.checked){rec.endDate='';endInput.value='';rec.period='';}
      applyDisabled();renderPreview();updatePeriodMessage(card,rec);
    });
    const msg=document.createElement('p');msg.className='field-help period-import-warning';wrap.append(msg);
    const bad=document.createElement('p');bad.className='field-help period-order-warning';
    bad.textContent='A data de término é anterior à data de início. Confira mês e ano.';
    wrap.append(bad);
    updatePeriodMessage(wrap,item);
    return wrap;
  }
  function renderRepeat(type) {
    const target = $(type === 'experiences' ? 'experiences-list':'education-list');
    target.replaceChildren();
    state[type].forEach((item,index) => {
      const card = document.createElement('div');
      card.className = 'repeat-card';
      card.dataset.type = type;
      card.dataset.index = index;
      const head = document.createElement('div'); head.className='repeat-head';
      const title = document.createElement('strong'); title.textContent = type==='experiences'?`Experiência ${index+1}`:`Formação ${index+1}`;
      const remove = document.createElement('button'); remove.type='button'; remove.className='remove-item'; remove.textContent='Remover';
      remove.setAttribute('aria-label', `Remover ${type==='experiences'?'experiência':'formação'} ${index+1}`);
      remove.addEventListener('click',()=>{state[type].splice(index,1);renderRepeat(type);renderPreview();});
      head.append(title,remove);card.append(head);
      if(type==='experiences') {
        card.append(field('Cargo ou função','role',item.role,card,false,'Ex.: Atendente'));
        card.append(field('Empresa ou local de trabalho','company',item.company,card,false,'Ex.: Comércio local'));
        card.append(periodInputs(type,item,card));
        card.append(field('Principais atividades','description',item.description,card,true,'Descreva atividades que realmente realizou.'));
      } else {
        card.append(field('Curso ou escolaridade','course',item.course,card,false,'Ex.: Ensino médio completo'));
        card.append(field('Instituição','institution',item.institution,card,false,'Ex.: Escola Estadual'));
        card.append(periodInputs(type,item,card));
        card.append(field('Informações adicionais (opcional)','description',item.description||'',card,true,'Ex.: Formação complementar em tecnologia.'));
      }
      target.append(card);
    });
  }
  function addExperience(){state.experiences.push({role:'',company:'',period:'',startDate:'',endDate:'',ongoing:false,description:''});renderRepeat('experiences');renderPreview();}
  function addEducation(){state.education.push({course:'',institution:'',period:'',startDate:'',endDate:'',ongoing:false,description:''});renderRepeat('education');renderPreview();}
  function bindForm() {
    dataFields().forEach(name => {
      $('field-'+name).addEventListener('input',event => {
        state[name] = event.currentTarget.value;
        renderPreview();
      });
    });
    $('resume-form').addEventListener('submit',event=>event.preventDefault());
    $('add-experience').addEventListener('click',addExperience);
    $('add-education').addEventListener('click',addEducation);
  }
  function invalidEmail(email){return !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}
  function reviewRules() {
    const items = [];
    function add(status,title,description,focus){items.push({status,title,description,focus});}
    if(!state.name.trim()) add('warning','Inclua seu nome completo','Seu nome deve aparecer no início do currículo.','field-name');
    else add('good','Nome preenchido','Confira se está escrito exatamente como você deseja apresentar.','field-name');
    if (!state.email.trim() && !state.phone.trim()) add('warning','Informe um contato','Inclua pelo menos um e-mail ou telefone para receber retornos.','field-email');
    else if(invalidEmail(state.email.trim())) add('warning','Verifique o e-mail','O endereço parece estar incompleto ou conter erros.','field-email');
    else add('good','Contato disponível','Lembre-se de verificar se seu telefone e e-mail estão atualizados.','field-email');
    if(!state.objective.trim()) add('warning','Defina um objetivo profissional','Indique o cargo ou a área de interesse de maneira objetiva.','field-objective');
    if(!state.summary.trim()) add('warning','Escreva uma apresentação curta','Conte brevemente suas habilidades ou experiências reais.','field-summary');
    else if(state.summary.trim().length > 550) add('warning','Resumo muito longo','Tente reduzir o texto para torná-lo mais fácil de ler.','field-summary');
    else add('good','Resumo incluído','Verifique se a linguagem está clara e se não há informações inventadas.','field-summary');
    const exp = state.experiences.filter(hasEntry);
    if(exp.length && exp.some(e=>!e.role.trim() || !e.description.trim())) add('warning','Confira as experiências','Procure informar a função exercida e suas principais atividades.','experiences-list');
    for(const [type,entries] of [['experiências',state.experiences],['formações',state.education]]){
      const focus=type==='experiências'?'experiences-list':'education-list';
      if(entries.some(periodos.backwards)) add('warning','Confira a ordem das datas',`Uma das ${type} tem término anterior ao início. Corrija o mês e ano.`,focus);
      if(entries.some(item=>{
        if(!item.originalPeriod && !item.period)return false;
        return !((item.startDate&&(item.endDate||item.ongoing)) || (type==='formações' && item.endDate));
      })) add('warning','Período importado sem confirmação',`Uma das ${type} contém uma data que não foi possível converter com segurança. Informe mês/ano nos campos correspondentes.`,focus);
    }
    if(!exp.length && !state.education.some(e=>e.course.trim())) add('warning','Descreva sua trajetória','Inclua alguma formação ou experiência, mesmo que informal ou voluntária, se realmente tiver.','education-list');
    if(!state.skills.trim()) add('warning','Liste suas competências','Inclua habilidades que você possui e pode demonstrar.','field-skills');
    if(state.phone.trim() && state.phone.replace(/\D/g,'').length < 10) add('warning','Confira o telefone','O número parece estar incompleto.','field-phone');
    add('good','Não inclua informações sensíveis','Evite CPF, RG, endereço completo, fotografia e dados que não sejam relevantes para a candidatura.',null);
    return items;
  }
  function renderReview() {
    const items=reviewRules();const warnings=items.filter(i=>i.status==='warning');
    $('review-count').textContent = warnings.length ? `${warnings.length} ${warnings.length===1?'ponto':'pontos'} para conferir`:'Revisão básica concluída';
    $('review-caption').textContent = 'Sugestões automáticas simples. A decisão final sobre o texto é sua.';
    const list=$('review-items');list.replaceChildren();
    items.forEach(item => {
      const wrap=document.createElement('div');wrap.className='review-card '+item.status;
      const h=document.createElement('strong');h.textContent=(item.status==='good'?'✓ ':'! ')+item.title;
      const p=document.createElement('p');p.textContent=item.description;
      wrap.append(h,p);
      if(item.focus){
        const btn=document.createElement('button');btn.type='button';btn.textContent='Ir para este campo';
        btn.addEventListener('click',()=>{
          selectTab('edit');
          const target=$(item.focus);target.scrollIntoView({behavior:'smooth',block:'center'});
          if(['INPUT','TEXTAREA'].includes(target.tagName))target.focus({preventScroll:true});
        });wrap.append(btn);
      }
      list.append(wrap);
    });
  }
  function renderImportAnalysis(result) {
    const el=$('import-analysis');
    el.replaceChildren();el.hidden=false;
    const title=document.createElement('strong');title.textContent='Seções identificadas na importação';el.append(title);
    const counts=result.counts;
    const countsP=document.createElement('p');countsP.textContent=`${counts.education} formação(ões), ${counts.courses} curso(s), ${counts.skills} linha(s) de habilidades e ${counts.experiences} experiência(s).`;
    el.append(countsP);
    if(result.parsed.summary && !result.parsed.objective){
      const p=document.createElement('p');p.textContent='Uma apresentação pessoal foi colocada em Perfil profissional, pois não define um cargo específico.';el.append(p);
    }
    if(result.periodWarnings?.length){
      const warning=document.createElement('p');warning.className='import-alert';
      warning.textContent='Confira estes períodos: o texto não deixa clara a ligação entre as datas. Nenhum período foi corrigido automaticamente:';el.append(warning);
      for(const entry of result.periodWarnings){
        const period=document.createElement('p');period.textContent=`${entry.company}: ${entry.period}`;el.append(period);
      }
    }
    if(result.unmapped){
      const warning=document.createElement('p');warning.className='import-alert';warning.textContent='Atenção: há informações fora das seções reconhecidas. Elas foram preservadas no texto colado, mas precisam de conferência manual:';el.append(warning);
      const pre=document.createElement('pre');pre.textContent=result.unmapped;el.append(pre);
    } else {
      const p=document.createElement('p');p.textContent='Nenhuma seção desconhecida foi encontrada. Confira nomes, períodos e conteúdo de cada campo.';el.append(p);
    }
  }
  function importPlainText() {
    const raw=$('import-text').value.trim();
    if(!raw){setImportStatus('Cole o texto do currículo ou selecione um arquivo antes de continuar.',true);return;}
    const hasWork = Object.values(state).some(v => Array.isArray(v) ? v.length > 0 : !!v.trim());
    if (hasWork && !confirm('A importação substituirá os dados que estão no editor. Deseja continuar?')) return;
    const result=window.CurriculoParser.parse(raw);
    const {parsed}=result;
    state=empty();
    let count=0;
    for(const [key,val] of Object.entries(parsed)) {
      if(Array.isArray(val)){ if(val.length){state[key]=['experiences','education'].includes(key)?val.map(item=>periodos.hydrate(item,key)):val;count++;} }
      else if(val && String(val).trim()){state[key]=val;count++;}
    }
    syncBaseFields();renderRepeat('experiences');renderRepeat('education');renderPreview();
    renderImportAnalysis(result);
    selectTab('edit');
    toast(`Importação organizada: ${result.counts.education} formação(ões), ${result.counts.courses} curso(s). Confira os campos.`);
    $('field-name').focus({preventScroll:true});
  }
  function setImportStatus(message,isError=false){
    const el=$('import-status'); el.hidden=false;el.textContent=message;el.classList.toggle('error',isError);
  }
  async function importFile(evt) {
    const file=evt.target.files?.[0];if(!file)return;
    if(file.size>4*1024*1024){setImportStatus('O arquivo ultrapassa 4 MB. Escolha um documento menor ou cole o texto.',true);return;}
    const ext=file.name.split('.').pop().toLowerCase();
    try{
      let result;
      if(ext==='txt')result=await file.text();
      else if(ext==='docx')result=await window.CurriculoDocx.extractDocx(await file.arrayBuffer());
      else throw new Error('Formato não suportado. Envie DOCX ou TXT.');
      $('import-text').value=result;
      setImportStatus(`Texto extraído de “${file.name}”. Confira abaixo e clique em “Aproveitar informações no editor”.`);
    }catch(err){setImportStatus(err.message||'O arquivo não pôde ser lido.',true);}
    finally {evt.target.value='';}
  }
  function printResume() {
    if(!state.name.trim()){
      selectTab('edit');$('field-name').focus();toast('Preencha seu nome antes de salvar o currículo.');return;
    }
    if(!state.email.trim() && !state.phone.trim()){
      selectTab('edit');$('field-email').focus();toast('Adicione pelo menos um contato antes de salvar o currículo.');return;
    }
    if(invalidEmail(state.email.trim())){
      selectTab('edit');$('field-email').focus();toast('Corrija o e-mail antes de salvar.');return;
    }
    if(!printHintShown){
      alert('Para salvar um PDF sem textos nas bordas, desative “Cabeçalhos e rodapés” na janela de impressão.\n\nNo Chrome ou Edge: Mais definições > desmarque “Cabeçalhos e rodapés”.');
      printHintShown = true;
    }
    if([...state.experiences,...state.education].some(periodos.backwards)){
      selectTab('review');toast('Confira as datas: há um término anterior ao início.');return;
    }
    window.print();
  }
  function setLayout(value) {
    const descriptions = {
      compacto: 'Compacto: menos espaçamento e texto menor. Melhor para currículos longos.',
      padrao: 'Padrão: equilíbrio entre leitura e aproveitamento da página.',
      amplo: 'Amplo: mais destaque e espaços entre as informações. Ideal para currículos curtos.'
    };
    const layout = Object.prototype.hasOwnProperty.call(descriptions, value) ? value : 'amplo';
    const preview = $('resume-preview');
    preview.classList.remove('layout-compacto', 'layout-padrao', 'layout-amplo');
    preview.classList.add('layout-' + layout);
    $('layout-description').textContent = descriptions[layout];
    $('layout-select').value = layout;
  }
  function reset() {
    if(!confirm('Apagar as informações deste currículo? Essa ação não pode ser desfeita.'))return;
    state=empty();syncBaseFields();renderRepeat('experiences');renderRepeat('education');renderPreview();
    $('import-text').value='';$('import-status').hidden=true;$('import-analysis').hidden=true;selectTab('edit');toast('Formulário limpo.');
  }
  function start(which){showScreen('app');selectTab(which);}
  function wire() {
    $('brand-link').addEventListener('click',e=>{e.preventDefault();showScreen('home');});
    $('nav-home').addEventListener('click',()=>showScreen('home'));
    $('nav-editor').addEventListener('click',()=>start('edit'));
    $('start-create').addEventListener('click',()=>start('edit'));
    $('start-improve').addEventListener('click',()=>start('import'));
    for(const name of ['edit','import','review'])$('tab-'+name).addEventListener('click',()=>selectTab(name));
    $('go-review').addEventListener('click',()=>selectTab('review'));
    $('back-edit').addEventListener('click',()=>selectTab('edit'));
    $('file-import').addEventListener('change',importFile);
    $('parse-import').addEventListener('click',importPlainText);
    for(const id of ['print-button','print-button-top','print-button-review'])$(id).addEventListener('click',printResume);
    $('reset-button').addEventListener('click',reset);
    $('layout-select').addEventListener('change', event => setLayout(event.target.value));
    bindForm();setLayout('amplo');renderPreview();
    // Only in-memory data; no localStorage, cookies, tracking or network requests.
  }
  wire();
})();
