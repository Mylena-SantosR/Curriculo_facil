const assert=require('node:assert/strict');
require('../assets/js/period-utils.js');
const date=globalThis.CurriculoPeriodos;
assert.deepEqual(date.parsePeriod('De setembro de 2023 até dezembro de 2023','experiences'),
  {startDate:'2023-09',endDate:'2023-12',ongoing:false,period:''});
assert.deepEqual(date.parsePeriod('02/2020 a 11/2022','experiences'),
  {startDate:'2020-02',endDate:'2022-11',ongoing:false,period:''});
assert.deepEqual(date.parsePeriod('Desde março de 2024 até atualmente','experiences'),
  {startDate:'2024-03',endDate:'',ongoing:true,period:''});
assert.equal(date.parsePeriod('De janeiro de 2024 outubro de 2024','experiences').period,'De janeiro de 2024 outubro de 2024');
assert.equal(date.parsePeriod('2024','education').period,'2024');
assert.equal(date.parsePeriod('cursando','education').ongoing,true);
assert.equal(date.parsePeriod('Concluído em julho de 2019','education').endDate,'2019-07');
assert.equal(date.label({startDate:'2023-09',endDate:'2023-12',ongoing:false,period:''},'experiences'),'09/2023 – 12/2023');
assert.equal(date.label({startDate:'2023-09',endDate:'',ongoing:true,period:''},'experiences'),'09/2023 – Atualmente');
assert.equal(date.label({startDate:'2023-09',endDate:'',ongoing:true,period:''},'education'),'09/2023 – Em andamento');
assert.ok(date.backwards({startDate:'2024-10',endDate:'2024-02',ongoing:false}));
assert.ok(!date.backwards({startDate:'2024-10',endDate:'2024-02',ongoing:true}));
console.log('OK: parsing de períodos, preservação de datas ambíguas, datas atuais, formatação MM/AAAA e validação.');

const abbreviations=['Abr/2025 a Jun/2025','Jan/2024 a Out/2024','Set/2023 a Dez/2023'];
const expected=[['2025-04','2025-06'],['2024-01','2024-10'],['2023-09','2023-12']];
abbreviations.forEach((p,i)=>{
  const parsed=globalThis.CurriculoPeriodos.parsePeriod(p,'experiences');
  assert.deepEqual([parsed.startDate,parsed.endDate],expected[i],JSON.stringify(parsed));
});
console.log('OK: meses abreviados importados como datas estruturadas.');
