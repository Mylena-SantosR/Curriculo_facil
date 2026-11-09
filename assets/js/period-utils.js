/* Currículo Fácil: períodos em mês/ano, sem suposições de datas na importação. */
(function (root) {
  'use strict';
  const months = {janeiro:1,jan:1,fevereiro:2,fev:2,marco:3,mar:3,abril:4,abr:4,maio:5,mai:5,junho:6,jun:6,julho:7,jul:7,agosto:8,ago:8,setembro:9,set:9,outubro:10,out:10,novembro:11,nov:11,dezembro:12,dez:12};
  const normalize = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const monthNames = Object.keys(months).join('|');
  const token = new RegExp(`\\b(?:(${monthNames})\\.?\\s*(?:de\\s+|[\\/.-]\\s*)?((?:19|20)\\d{2})|(0?[1-9]|1[0-2])[\\/.-]((?:19|20)\\d{2}))\\b`, 'gi');
  const parseOne = raw => {
    const s=normalize(raw).replace(/\.$/,'');
    const text=s.match(new RegExp(`^(${monthNames})\\.?\\s*(?:de\\s+|[\\/.-]\\s*)?((?:19|20)\\d{2})$`));
    if(text)return `${text[2]}-${String(months[text[1]]).padStart(2,'0')}`;
    const numeric=s.match(/^(0?[1-9]|1[0-2])[\/.-]((?:19|20)\d{2})$/);
    if(numeric)return `${numeric[2]}-${numeric[1].padStart(2,'0')}`;
    return '';
  };
  function formatMonth(value) {
    const m=String(value||'').match(/^((?:19|20)\d{2})-(0[1-9]|1[0-2])$/);
    return m?`${m[2]}/${m[1]}`:'';
  }
  function parsePeriod(raw, type) {
    const source=String(raw||'').trim();
    const result={startDate:'',endDate:'',ongoing:false,period:''};
    if(!source)return result;
    const normalized=normalize(source).replace(/\s+/g,' ');
    const all=[...normalized.matchAll(new RegExp(token.source,'gi'))];
    const items=all.map(m=>({value:parseOne(m[0]),start:m.index,end:m.index+m[0].length})).filter(m=>m.value);
    const prefix=items.length?normalized.slice(0,items[0].start).trim():normalized;
    const suffix=items.length?normalized.slice(items[items.length-1].end).trim():'';
    const ongoing=/(?:^|\b)(?:atual(?:mente)?|presente|em andamento|cursando|ate hoje|ate o momento)(?:\b|$)/.test(normalized);
    const fromStart=/^(?:de|desde|inicio(?: em)?|iniciado em|a partir de)?\s*:?\s*$/.test(prefix);
    const fromEnd=/^(?:ate|termino(?: em)?|conclusao(?: em)?|concluido em|finalizado em)\s*:?\s*$/.test(prefix);
    if(!items.length){
      if(/^(?:cursando|em andamento|atualmente|atual|presente)$/.test(normalized))result.ongoing=true;
      else result.period=source;
      return result;
    }
    if(items.length===2){
      const between=normalized.slice(items[0].end,items[1].start).trim();
      const validJoin=/^(?:a|ate|ao|e|[-–—]|ate o mes de|ate o ano de|a partir de)\s*(?:de)?$/.test(between);
      if(validJoin && fromStart && !suffix && items[0].value<=items[1].value){
        result.startDate=items[0].value;
        result.endDate=items[1].value;
      } else result.period=source;
    } else if(items.length===1){
      if(ongoing && fromStart && /^(?:[-–—]|a|ate|ao)?\s*(?:atual(?:mente)?|presente|em andamento|cursando|ate hoje|ate o momento)$/.test(suffix)){
        result.startDate=items[0].value;result.ongoing=true;
      } else if(!suffix && fromEnd){
        result.endDate=items[0].value;
      } else if(!suffix && (prefix==='desde'||prefix==='inicio em'||prefix==='iniciado em'||prefix==='a partir de')){
        result.startDate=items[0].value;
      } else {
        // Data isolada pode ser início ou conclusão: precisa ser confirmada.
        result.period=source;
      }
    } else result.period=source;
    return result;
  }
  function hydrate(item,type){
    const base={...item};
    const parsed=parsePeriod(base.period,type);
    return {...base, ...parsed, originalPeriod:parsed.period};
  }
  function label(item,type){
    const start=formatMonth(item.startDate);
    const end=formatMonth(item.endDate);
    const today=type==='education'?'Em andamento':'Atualmente';
    if(start && item.ongoing)return `${start} – ${today}`;
    if(start && end)return `${start} – ${end}`;
    if(start)return type==='education'?`Início: ${start}`:`Desde ${start}`;
    if(end)return type==='education'?`Conclusão: ${end}`:`Até ${end}`;
    if(item.ongoing)return today;
    return String(item.period||'').trim();
  }
  function backwards(item){return !!(item.startDate && item.endDate && item.endDate < item.startDate && !item.ongoing);}
  root.CurriculoPeriodos={parsePeriod,formatMonth,hydrate,label,backwards};
})(typeof window!=='undefined'?window:globalThis);
