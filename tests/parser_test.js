// Executar: node tests/parser_test.js
const assert=require('node:assert/strict');
require('../assets/js/resume-parser.js');
const {parse,detectHeading}=globalThis.CurriculoParser;
assert.equal(detectHeading('CURSOS E APRIMORAMENTOS').kind,'courses');
assert.equal(detectHeading('HABILIDADES: Boa comunicação').value,'Boa comunicação');
assert.equal(detectHeading('FORMAÇÃO ACADÊMICA').kind,'education');
const sample=`Pessoa Exemplo da Silva
pessoa@example.com
(61) 99222-3333
OBJETIVO
Busco oportunidade para desenvolver habilidades e adquirir experiência profissional.
FORMAÇÃO ACADÊMICA
Ensino Médio Tech - cursando
C.E.H.R - Colégio Estadual Hélio Roriz
Ensino médio com formação complementar em tecnologia e informática.
CURSOS E APRIMORAMENTOS
Curso de Informática Básica
Rede Unike - Presencial
Carga horária: 74 horas
Conteúdo: Word, Excel e internet.
Curso de Rotinas Administrativas
Rede Unike - Presencial
Conteúdo: Matemática financeira.
Curso de Inclusividade
Escola Virtual - Online
Conteúdo: Respeito à diversidade.
Curso de Redação para Concurso
Kultivi - Online
Conteúdo: Técnicas de escrita.
HABILIDADES
Boa comunicação
Facilidade de adaptação
Organização e proatividade`;
const r=parse(sample);
assert.equal(r.parsed.education.length,1);
assert.equal(r.parsed.education[0].course,'Ensino Médio Tech');
assert.match(r.parsed.education[0].description,/formação complementar/);
assert.equal(r.counts.courses,4);
assert.equal(r.counts.skills,3);
assert.match(r.parsed.courses,/Curso de Rotinas Administrativas/);
assert.doesNotMatch(r.parsed.education[0].description,/Curso de Rotinas/);
assert.equal(r.parsed.objective,'');
assert.match(r.parsed.summary,/Busco oportunidade/);
assert.equal(r.unmapped,'');
const extras=parse('Pessoa Exemplo da Silva\nHABILIDADES\nOrganização\nREFERÊNCIAS\nDisponíveis mediante solicitação');
assert.match(extras.unmapped,/REFERÊNCIAS/);
assert.doesNotMatch(extras.parsed.skills,/REFERÊNCIAS/);

// Regressão da importação de três experiências com períodos em parênteses
// e rótulos "Cargo / Função" e "Atividades executadas".
const experienceSample=`Pessoa Teste da Silva
pessoa@example.com
PERFIL PROFISSIONAL
Tenho interesse em desenvolver minhas habilidades.
EXPERIÊNCIA PROFISSIONAL
Sushi Exemplo (De setembro de 2023 até dezembro de 2023)
Cargo / Função: Operadora de caixa
Atividades executadas:
Policlínica Exemplo (De janeiro de 2024 outubro de 2024)
Cargo / Função: Estagiária call center e recepção
Atividades executadas:
Organização de fichas e atendimento telefônico.
Casa Exemplo (De setembro de 2023 até dezembro de 2023)
Cargo / Função: Estagiária
Atividades executadas:
FORMAÇÃO ACADÊMICA
Ensino Médio completo.
HABILIDADES
Organização, Comunicação`;
const multi=parse(experienceSample);
assert.equal(multi.counts.experiences,3,JSON.stringify(multi.parsed.experiences));
assert.deepEqual(multi.parsed.experiences.map(x=>x.company),['Sushi Exemplo','Policlínica Exemplo','Casa Exemplo']);
assert.deepEqual(multi.parsed.experiences.map(x=>x.role),['Operadora de caixa','Estagiária call center e recepção','Estagiária']);
assert.equal(multi.parsed.experiences[0].period,'De setembro de 2023 até dezembro de 2023');
assert.equal(multi.parsed.experiences[1].period,'De janeiro de 2024 outubro de 2024');
assert.deepEqual(multi.periodWarnings.map(x=>x.company),['Policlínica Exemplo']);
assert.equal(multi.parsed.experiences[0].description,'');
assert.equal(multi.parsed.experiences[1].description,'Organização de fichas e atendimento telefônico.');
assert.equal(multi.parsed.experiences[2].description,'');
assert.ok(multi.parsed.experiences.every(x=>!x.description.includes('Atividades executadas')));

// Variantes com empresa em linha isolada e rótulos escritos de outro modo.
const alternate=parse(`Pessoa Exemplo
EXPERIÊNCIAS PROFISSIONAIS
Empresa Alfa
Cargo/Função: Atendente
Período: 2020 a 2022
Atividades: Atendimento ao público
Empresa Beta
Cargo ou Função: Recepcionista
Período: 2023 a 2024
Descrição das atividades: Organização de documentos`);
assert.equal(alternate.counts.experiences,2,JSON.stringify(alternate.parsed.experiences));
assert.equal(alternate.parsed.experiences[0].company,'Empresa Alfa');
assert.equal(alternate.parsed.experiences[0].role,'Atendente');
assert.equal(alternate.parsed.experiences[0].period,'2020 a 2022');
assert.equal(alternate.parsed.experiences[1].company,'Empresa Beta');
assert.equal(alternate.parsed.experiences[1].role,'Recepcionista');
assert.equal(alternate.parsed.experiences[1].description,'Organização de documentos');
console.log('OK: seções, cursos, formação e experiências múltiplas com empresas, cargos e datas separados.');

// Regressão: empresa – cargo, com período abreviado na linha seguinte.
// Antes, todo o conteúdo era importado como uma única experiência.
const roleDateSample=`Pessoa de Exemplo
EXPERIÊNCIA PROFISSIONAL
Restaurante Modelo – Operadora de Caixa
Abr/2025 a Jun/2025
Atendimento ao cliente
Abertura e fechamento de caixa
Emissão de notas fiscais e recebimento de pagamentos
Policlínica Modelo – Estagiária Call Center e Recepção
Jan/2024 a Out/2024
Atendimento telefônico e presencial aos pacientes
Agendamento de consultas
Suporte a atividades administrativas
Loja Modelo – Estagiária Administrativa
Set/2023 a Dez/2023
Apoio à organização de arquivos
Atendimento ao público
Suporte à rotina administrativa do setor
FORMAÇÃO ACADÊMICA
Ensino Médio Completo`;
const separated=parse(roleDateSample);
assert.equal(separated.counts.experiences,3,JSON.stringify(separated.parsed.experiences));
assert.deepEqual(separated.parsed.experiences.map(e=>e.company),['Restaurante Modelo','Policlínica Modelo','Loja Modelo']);
assert.deepEqual(separated.parsed.experiences.map(e=>e.role),['Operadora de Caixa','Estagiária Call Center e Recepção','Estagiária Administrativa']);
assert.deepEqual(separated.parsed.experiences.map(e=>e.period),['Abr/2025 a Jun/2025','Jan/2024 a Out/2024','Set/2023 a Dez/2023']);
assert.deepEqual(separated.parsed.experiences.map(e=>e.description.split('\n').length),[3,3,3]);
assert.ok(separated.parsed.experiences.every(e=>!e.description.includes('– Estagiária')));
assert.equal(separated.parsed.education.length,1);

// Não criar vínculo novo se uma linha de atividades tiver um travessão,
// mas não houver período profissional na linha imediatamente seguinte.
const safe=parse(`Pessoa de Exemplo
EXPERIÊNCIA PROFISSIONAL
Empresa de Exemplo (De janeiro de 2020 até dezembro de 2021)
Cargo: Auxiliar
Atendimento – clientes e fornecedores
Organização de documentos
HABILIDADES
Comunicação`);
assert.equal(safe.parsed.experiences.length,1);
assert.match(safe.parsed.experiences[0].description,/Atendimento – clientes/);
console.log('OK: experiências com empresa, cargo e datas em linhas separadas.');
