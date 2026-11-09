/* Leitor de seções de currículos em português (sem servidor ou IA).
 * Mantém as informações separadas e informa trechos que precisam de conferência.
 */
(function (root) {
  'use strict';
  const buckets = ['header','objective','summary','experience','education','courses','skills','extras'];
  const labels = {header:'Cabeçalho',objective:'Objetivo',summary:'Perfil profissional',experience:'Experiência',education:'Formação acadêmica',courses:'Cursos e aprimoramentos',skills:'Habilidades',extras:'Outras informações'};
  const phrases = {
    objective:['objetivo','objetivo profissional','objetivos profissionais','area de interesse','cargo pretendido','cargo desejado'],
    summary:['resumo','resumo profissional','perfil','perfil profissional','sobre mim','apresentacao pessoal','apresentacao','qualificacoes profissionais','resumo de qualificacoes'],
    experience:['experiencia','experiencias','experiencia profissional','experiencias profissionais','experiencia de trabalho','historico profissional','historico de trabalho','atuacao profissional','vivencia profissional','experiencias anteriores'],
    education:['formacao','formacao escolar','formacao academica','formacao academica e escolaridade','formacao e escolaridade','escolaridade','educacao','educacao formal','formacao educacional','formacao e educacao'],
    courses:['cursos','cursos e aprimoramentos','curso e aprimoramento','cursos e certificacoes','certificacoes','certificados','cursos complementares','cursos livres','cursos e qualificacoes','qualificacoes e cursos','cursos e treinamentos','capacitacoes','formacao complementar','formacoes complementares','aperfeicoamento profissional','aperfeicoamentos','aprimoramentos','certificacoes e cursos','qualificacoes complementares'],
    skills:['habilidades','habilidades profissionais','habilidades e competencias','competencias','competencias profissionais','competencias e habilidades','conhecimentos','conhecimentos tecnicos','conhecimentos e habilidades','aptidoes','aptidoes profissionais','soft skills'],
    extras:['idiomas','informacoes adicionais','informacoes complementares','dados adicionais','outras informacoes','projetos','atividades complementares','referencias','referencias profissionais','trabalhos voluntarios','atividades extracurriculares']
  };
  const titleMap = new Map(Object.entries(phrases).flatMap(([kind, values])=>values.map(v=>[v,kind])));
  const normalize = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim();
  function stripDecoration(s){return s.replace(/^\s*(?:(?:\d+)[.)-]\s*)?[•●▪▸➤*\-–—]\s*/,'').trim();}
  function detectHeading(line) {
    const raw = stripDecoration(line).trim();
    const exact = titleMap.get(normalize(raw));
    if (exact) return {kind:exact,value:''};
    // Títulos com dois-pontos na mesma linha: "HABILIDADES: ...".
    const match = raw.match(/^([^:：]{3,65})\s*[:：]\s*(.*)$/);
    if(match){const kind=titleMap.get(normalize(match[1]));if(kind)return {kind,value:match[2].trim()};}
    return null;
  }
  function looksLikeUnknownHeading(line){
    const raw=line.trim().replace(/[:\s]+$/,'');
    const letters=raw.replace(/[^\p{L}]/gu,'');
    return letters.length>=5 && raw.length<=65 && letters===letters.toUpperCase() && letters!==letters.toLowerCase() && !/\d/.test(raw);
  }
  const looksCourse = s => /^(?:[-•]\s*)?(?:curso(?:\s+(?:de|em|b[aá]sico|livre))?|capacita[cç][aã]o|treinamento|workshop|certifica[cç][aã]o|inform[aá]tica b[aá]sica)\b/i.test(s);
  const looksSchooling = s => s.length<=110 && !/\bcom forma[cç][aã]o complementar\b/i.test(s) && /^(?:[-•]\s*)?(?:ensino (?:m[eé]dio|fundamental|superior)|gradua[cç][aã]o|bacharelado|licenciatura|tecn[oó]logo|p[oó]s.gradua[cç][aã]o|mestrado|doutorado|ensino t[eé]cnico|curso t[eé]cnico|t[eé]cnico em|educa[cç][aã]o de jovens e adultos|eja)\b/i.test(s);
  const periodTokens = /\b(?:cursando|em andamento|conclu[ií]d[oa]|finalizad[oa]|conclus[aã]o(?:\s+prevista)?|20\d{2}|19\d{2}|atual)\b/i;
  const instTokens = /\b(?:col[eé]gio|escola|universidade|faculdade|instituto|centro universit[aá]rio|senac|senai|ifg|ifb|unb)\b|^c\.?e\.?h\.?r\.?/i;
  function preprocess(raw) {
    return String(raw||'').replace(/\r/g,'')
      .replace(/[\t\u00a0]+/g,' ')
      // Quando separadores da extração DOCX unem blocos, isolar títulos conhecidos.
      .replace(/\s+[/|]\s+(?=(?:CURSOS\s+E\s+APRIMORAMENTOS|CURSOS\s+E\s+CERTIFICA[CÇ][OÕ]ES|FORMA[CÇ][AÃ]O\s+ACAD[EÊ]MICA|HABILIDADES|COMPET[EÊ]NCIAS|EXPERI[EÊ]NCIA\s+PROFISSIONAL)\b)/gi,'\n')
      .split('\n').map(line=>line.trim());
  }
  function segment(raw) {
    const sections=Object.fromEntries(buckets.map(k=>[k,[]]));
    const unknownHeadings=[];
    const lines=preprocess(raw);
    let current='header';
    for(let i=0;i<lines.length;i++){
      const line=lines[i];if(!line)continue;
      let heading=detectHeading(line);
      // Cabeçalhos partidos pela formatação de um DOCX.
      if(!heading && lines[i+1] && line.length < 50){
        const joined=detectHeading(line+' '+lines[i+1]);
        if(joined && !joined.value){heading=joined;i++;}
      }
      if(heading){current=heading.kind;if(current==='extras')sections.extras.push(line);if(heading.value)sections[current].push(heading.value);continue;}
      if(current!=='skills' && current!=='courses' && !looksSchooling(line) && !looksCourse(line) && looksLikeUnknownHeading(line)){
        current='extras';unknownHeadings.push(line);sections.extras.push(line);continue;
      }
      // Se os cursos vierem imediatamente depois da escolaridade, sem cabeçalho,
      // não anexar cursos de curta duração ao campo "Formação acadêmica".
      if(current==='education' && looksCourse(line) && sections.education.some(looksSchooling)) current='courses';
      sections[current].push(line);
    }
    return {sections,unknownHeadings};
  }
  function isName(s){
    const n=normalize(s);
    return n.length>=6 && n.length<=100 && n.split(' ').length>=2 && !/\d|@|www|linkedin|curriculo|contato|telefone|celular|email|objetivo|resumo|endereco|cep|brasil|nacionalidade/.test(n);
  }
  function identifyName(lines){
    for(const line of lines.slice(0,10)){
      const explicit=line.match(/^nome(?:\s+completo)?\s*[:：]\s*(.+)$/i);
      if(explicit && isName(explicit[1]))return explicit[1];
      if(isName(line) && !line.includes('|') && !line.includes(' • '))return line;
    }
    return '';
  }
  function splitCourses(lines){
    const items=[];
    const meta=/^(?:conte[uú]do|carga hor[aá]ria|institui[cç][aã]o|modalidade|dura[cç][aã]o|local)\s*:/i;
    const provider=/(?:\bpresencial\b|\bonline\b|\bremoto\b|\bead\b)/i;
    const add = text => {
      const s=text.trim().replace(/^[\s•\-]+/,'');
      if(!s)return;
      // Separar blocos em que a origem usa " / Curso de ...".
      const segments=s.split(/\s+\/\s+(?=(?:curso|capacita[cç][aã]o|workshop|treinamento)\b)/i);
      for(const segment of segments){
        const item=segment.trim();if(!item)continue;
        if(items.length && (meta.test(item) || (provider.test(item) && !looksCourse(item)))){
          items[items.length-1]+=' — '+item;
        }else items.push(item);
      }
    };
    lines.forEach(add);
    return items;
  }
  function parseEducation(lines){
    const groups=[];let active=[];
    const flush=()=>{if(active.length){groups.push(active);active=[];}};
    for (const line of lines){
      // Identificar um novo nível de escolaridade e abrir outro bloco.
      if(looksSchooling(line) && active.some(looksSchooling))flush();
      active.push(line);
    }
    flush();
    return groups.map(group=>{
      const rec={course:'',institution:'',period:'',description:''};
      const remaining=[];
      group.forEach((line,index)=>{
        if(index===0){
          const m=line.match(/^(.+?)\s*[-–—]\s*(cursando|em andamento|conclu[ií]d[oa]|finalizad[oa]|\d{4}(?:\s*[-–]\s*\d{4})?)$/i);
          if(m){rec.course=m[1].trim();rec.period=m[2].trim();}else rec.course=line;
        }else if(!rec.institution && instTokens.test(line))rec.institution=line;
        else if(!rec.period && periodTokens.test(line) && line.length<45)rec.period=line;
        else remaining.push(line);
      });
      rec.description=remaining.join('\n');
      return rec;
    });
  }
  // Reconhece "Empresa (De janeiro de 2022 até março de 2023)" e variantes
  // sem alterar datas originalmente escritas. O usuário deve conferir períodos ambíguos.
  const workYear = /\b(?:19|20)\d{2}\b/;
  const workMonth = /\b(?:janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan\.?|fev\.?|mar\.?|abr\.?|mai\.?|jun\.?|jul\.?|ago\.?|set\.?|out\.?|nov\.?|dez\.?)\b/i;
  const workPresent = /\b(?:atual|atualmente|presente|em andamento)\b/i;
  function workPeriod(text) {
    const s=String(text||'').trim();
    return (workYear.test(s) || workPresent.test(s)) &&
      (workMonth.test(s) || /\d{1,2}[/.-]\d{4}|\b(?:19|20)\d{2}\b|\bdesde\b/i.test(s));
  }
  function employerPeriod(line) {
    const s=line.trim().replace(/^[•▪\-]\s*/, '');
    // Empresa (período): o nome da empresa deve ser separado do conteúdo entre parênteses.
    const m=s.match(/^(.{2,100}?)\s*\(\s*([^()]{4,120})\s*\)\s*$/);
    if (m && workPeriod(m[2])) return {company:m[1].trim(),period:m[2].trim()};
    // Empresa — 2020 a 2022, Empresa | 02/2020 a 03/2023.
    const withSeparator=s.match(/^(.{2,100}?)\s+(?:[—–|]|\s-\s)\s*((?:de\s+|desde\s+)?(?:\d{1,2}\/)?(?:19|20)\d{2}\b.*)$/i);
    if (withSeparator && workPeriod(withSeparator[2])) return {company:withSeparator[1].trim(),period:withSeparator[2].trim()};
    return null;
  }
  function experienceLabel(line) {
    const m=line.match(/^([^:：]{2,50})\s*[:：]\s*(.*)$/);
    if(!m)return null;
    const label=normalize(m[1]);
    let kind=null;
    if (/^cargo(?: (?:ou |e )?funcao)?$/.test(label) || label==='funcao' || label==='cargo exercido') kind='role';
    else if (/^(?:empresa|empregador|organizacao|local de trabalho)$/.test(label)) kind='company';
    else if (/^(?:periodo|periodo de trabalho|duracao|data de inicio e fim)$/.test(label)) kind='period';
    else if (/^(?:atividades|atividades executadas|principais atividades|responsabilidades|atribuicoes|descricao|descricao das atividades|funcoes exercidas)$/.test(label)) kind='description';
    return kind?{kind,value:m[2].trim()}:null;
  }
  // Muitos currículos usam "Empresa – Cargo" em uma linha e o período na
  // linha seguinte. Detectar apenas quando há uma data na próxima linha para
  // não confundir tarefas com vínculos profissionais.
  function standaloneWorkPeriod(line) {
    const s=String(line||'').trim();
    if(!s || s.length>110 || !workPeriod(s))return false;
    if(/^(?:de\s+|desde\s+)?(?:(?:19|20)\d{2}\b|(?:0?[1-9]|1[0-2])[\/.-](?:19|20)\d{2}\b)/i.test(s))return true;
    return /^(?:(?:de|desde)\s+)?(?:janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan\.?|fev\.?|mar\.?|abr\.?|mai\.?|jun\.?|jul\.?|ago\.?|set\.?|out\.?|nov\.?|dez\.?)(?=\s|[\/.-]|\d)/i.test(s);
  }
  function employerRoleBeforeDate(line, nextLine){
    const s=String(line||'').trim();
    const next=String(nextLine||'').trim();
    if(!standaloneWorkPeriod(next) && !(experienceLabel(next)?.kind==='period' && workPeriod(experienceLabel(next).value)))return null;
    if(experienceLabel(s) || workPeriod(s))return null;
    const m=s.match(/^(.{2,100}?)\s+(?:[–—]|-)\s+(.{3,100})$/);
    if(!m || !m[1].trim() || !m[2].trim())return null;
    if(/^(?:atividades|responsabilidades|atribui[cç][oõ]es|descri[cç][aã]o|observa[cç][oõ]es)\b/i.test(m[1]))return null;
    return {company:m[1].trim(),role:m[2].trim()};
  }
  function parseExperiences(lines){
    if(!lines.length)return [];
    const groups=[];let active=[];
    const flush=()=>{if(active.length){groups.push(active);active=[];}};
    // Uma experiência começa por "Empresa (período)", "Empresa: X" ou por
    // um nome de empresa seguido de "Cargo / Função:". Nunca agrupar
    // vários vínculos apenas porque estão sob um título geral de EXPERIÊNCIAS.
    for(let i=0;i<lines.length;i++){
      const line=lines[i].trim();if(!line)continue;
      const label=experienceLabel(line);
      const header=employerPeriod(line);
      const next=lines.slice(i+1).find(v=>v.trim())||'';
      const compact=employerRoleBeforeDate(line,next);
      const nextLabel=experienceLabel(next);
      const employerBeforeRole=!header && !compact && !label && nextLabel?.kind==='role' &&
        line.length<=100 && !workPeriod(line) && !/^[-•]/.test(line);
      const activeHasRole=active.some((v,j)=>experienceLabel(v)?.kind==='role' || employerRoleBeforeDate(v,active[j+1]||''));
      const activeHasCompany=active.some((v,j)=>employerPeriod(v) || employerRoleBeforeDate(v,active[j+1]||'') || experienceLabel(v)?.kind==='company');
      const newEmployer=!!header || !!compact || employerBeforeRole || label?.kind==='company';
      if(active.length && ((newEmployer && (activeHasRole || activeHasCompany)) ||
        (label?.kind==='role' && activeHasRole)))flush();
      active.push(line);
    }
    flush();
    return groups.map(group=>{
      const item={role:'',company:'',period:'',description:''};
      const other=[];
      for(let i=0;i<group.length;i++){
        const line=group[i];
        const header=employerPeriod(line);
        if(header){
          if(!item.company)item.company=header.company;
          if(!item.period)item.period=header.period;
          continue;
        }
        const compact=employerRoleBeforeDate(line,group[i+1]||'');
        if(compact){
          if(!item.company)item.company=compact.company;
          if(!item.role)item.role=compact.role;
          continue;
        }
        const label=experienceLabel(line);
        if(label){
          if(label.kind==='description'){
            // Rótulo sem informação não deve contaminar o conteúdo do currículo.
            if(label.value)other.push(label.value);
          }else if(!item[label.kind]) item[label.kind]=label.value;
          else if(label.value && label.value!==item[label.kind])other.push(label.value);
          continue;
        }
        const nextLabel=experienceLabel(group[i+1]||'');
        if(!item.company && nextLabel?.kind==='role' && line.length<=100 && !workPeriod(line)){
          item.company=line;continue;
        }
        if(!item.period && standaloneWorkPeriod(line)) {
          item.period=line;continue;
        }
        other.push(line);
      }
      // Fallback para currículos sem rótulos: preservar o papel e a organização
      // nas primeiras linhas, sem reinterpretar o restante como novas experiências.
      if(!item.role && other.length && other[0].length<=90) item.role=other.shift();
      if(!item.company && other.length && other[0].length<=90 && !workPeriod(other[0]) &&
          !/^[-•]/.test(other[0]))item.company=other.shift();
      if(!item.period && other.length && workPeriod(other[0]) && other[0].length<=90)item.period=other.shift();
      item.description=other.join('\n').trim();
      return item;
    }).filter(item=>Object.values(item).some(value=>value.trim()));
  }
  function parse(raw){
    const {sections,unknownHeadings}=segment(raw);
    const all=String(raw||'').replace(/\s+/g,' ');
    const email=(all.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'';
    const phone=(all.match(/(?:\+55\s*)?\(?\d{2}\)?[\s.-]*9?\d{4}[\s.-]*\d{4}/)||[])[0]||'';
    const link=(all.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_\-%]+/i)||[])[0]||'';
    const header=sections.header;
    const name=identifyName(header);
    let objective=sections.objective.join(' ').trim();
    let summary=sections.summary.join(' ').trim();
    const isNarrative=/^(?:busco|procuro|estou em busca|em busca|desejo|tenho interesse|pretendo|almejo|meu objetivo e|meu objetivo é)\b/i.test(objective);
    if(objective && (isNarrative || objective.length>140)){
      // "Busco oportunidade para..." é apresentação, não um cargo.
      summary=[objective,summary].filter(Boolean).join(' ').trim();objective='';
    }
    let city='';
    for(const s of header){
      const m=s.match(/^(.{2,55}),\s*([A-Z]{2})\b/);
      if(m){city=m[1]+', '+m[2];break;}
    }
    const skills=sections.skills.map(x=>x.replace(/^[•\-\s]+/,'').trim()).filter(Boolean).join(', ');
    const courses=splitCourses(sections.courses).join('\n');
    const parsed={name,email,phone,link,city,objective,summary,skills,courses,experiences:parseExperiences(sections.experience),education:parseEducation(sections.education)};
    // Períodos sem conexão clara entre duas datas exigem confirmação humana.
    // Nunca modificar ou inventar o separador por conta própria.
    const periodWarnings=parsed.experiences.filter(item=>{
      const years=[...item.period.matchAll(/\b(?:19|20)\d{2}\b/g)];
      if(years.length<2)return false;
      const between=item.period.slice(years[0].index+years[0][0].length,years[1].index);
      return !/\b(?:a|ate|ao|e)\b/.test(normalize(between)) && !/[—–-]/.test(between);
    }).map(item=>({company:item.company||item.role,period:item.period}));
    const counts={experiences:parsed.experiences.length,education:parsed.education.length,courses:splitCourses(sections.courses).length,skills:sections.skills.length};
    const unmapped=sections.extras.join('\n');
    return {parsed,counts,unmapped,unknownHeadings,periodWarnings,sectionCount:buckets.filter(k=>sections[k].length).length};
  }
  root.CurriculoParser={parse,segment,normalize,detectHeading};
})(typeof window!=='undefined'?window:globalThis);
