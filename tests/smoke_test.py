"""Teste simples end-to-end: python tests/smoke_test.py
Requer Playwright Python e Chromium disponíveis no ambiente.
"""
import tempfile
from bs4 import BeautifulSoup
from pathlib import Path
from playwright.sync_api import sync_playwright
from docx import Document

root = Path(__file__).resolve().parents[1]
def load_app(page):
    soup = BeautifulSoup((root/'index.html').read_text(encoding='utf-8'), 'html.parser')
    for tag in soup.select('script[src],link[rel=stylesheet]'):
        tag.decompose()
    page.set_content(str(soup))
    page.add_style_tag(content=(root/'assets/css/styles.css').read_text(encoding='utf-8'))
    page.add_script_tag(content=(root/'assets/js/docx-reader.js').read_text(encoding='utf-8'))
    page.add_script_tag(content=(root/'assets/js/resume-parser.js').read_text(encoding='utf-8'))
    page.add_script_tag(content=(root/'assets/js/period-utils.js').read_text(encoding='utf-8'))
    page.add_script_tag(content=(root/'assets/js/app.js').read_text(encoding='utf-8'))
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={"width": 1365, "height": 900}, accept_downloads=True)
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    load_app(page)
    assert page.locator('#screen-home').is_visible()
    page.locator('#start-create').click()
    assert page.locator('#panel-edit').is_visible()
    # Campos vazios não podem gerar rótulos ou textos fictícios no currículo.
    for ident in ('pv-name', 'pv-objective', 'pv-contact', 'pv-summary-wrap'):
        assert page.locator('#'+ident).is_hidden(), ident
    assert 'Cargo ou área de interesse' not in page.locator('#resume-preview').inner_text()
    assert 'Uma breve apresentação' not in page.locator('#resume-preview').inner_text()
    page.locator('#field-objective').fill('Atendente')
    assert page.locator('#pv-objective').is_visible()
    page.locator('#field-objective').fill('  ')
    assert page.locator('#pv-objective').is_hidden()
    assert page.locator('#pv-objective').inner_text() == ''
    page.locator('#field-summary').fill('Perfil preenchido')
    assert page.locator('#pv-summary-wrap').is_visible()
    page.locator('#field-summary').fill('  ')
    assert page.locator('#pv-summary-wrap').is_hidden()

    page.locator('#field-name').fill('Maria de Teste')
    page.locator('#field-email').fill('maria@example.com')
    page.locator('#field-objective').fill('Auxiliar administrativa')
    page.locator('#field-summary').fill('Experiência no atendimento e em rotinas de escritório.')
    page.locator('#add-experience').click()
    page.locator('#experiences-list [data-key="role"]').fill('Recepcionista')
    page.locator('#experiences-list [data-key="description"]').fill('Atendimento ao público e organização de documentos.')
    assert 'Maria de Teste' in page.locator('#resume-preview').inner_text()
    assert 'Recepcionista' in page.locator('#resume-preview').inner_text()
    assert page.locator('#experiences-list [data-key="startDate"]').get_attribute('type') == 'month'
    page.locator('#experiences-list [data-key="startDate"]').fill('2022-03')
    page.locator('#experiences-list [data-key="endDate"]').fill('2024-09')
    assert '03/2022 – 09/2024' in page.locator('#pv-experiences').inner_text()
    page.locator('#experiences-list [data-key="ongoing"]').check()
    assert page.locator('#experiences-list [data-key="endDate"]').is_disabled()
    assert '03/2022 – Atualmente' in page.locator('#pv-experiences').inner_text()
    page.locator('#experiences-list [data-key="ongoing"]').uncheck()
    page.locator('#experiences-list [data-key="endDate"]').fill('2021-09')
    page.locator('#tab-review').click()
    assert 'Confira a ordem das datas' in page.locator('#review-items').inner_text()
    page.locator('#tab-edit').click()
    page.locator('#experiences-list [data-key="endDate"]').fill('2024-09')
    page.locator('#add-education').click()
    assert page.locator('#education-list [data-key="startDate"]').get_attribute('type') == 'month'
    page.locator('#education-list [data-key="course"]').fill('Ensino médio')
    page.locator('#education-list [data-key="startDate"]').fill('2018-02')
    page.locator('#education-list [data-key="endDate"]').fill('2020-12')
    assert '02/2018 – 12/2020' in page.locator('#pv-education').inner_text()
    page.locator('#education-list [data-key="ongoing"]').check()
    assert '02/2018 – Em andamento' in page.locator('#pv-education').inner_text()

    page.locator('#tab-review').click()
    assert page.locator('#review-items .review-card').count() > 0
    page.locator('#tab-import').click()
    page.locator('#import-text').fill('Joana Silva\njoana@example.com\n(61) 99999-1234\nOBJETIVO\nAtendente\nRESUMO PROFISSIONAL\nAtendimento ao público\nHABILIDADES\nOrganização, Atendimento')
    page.once('dialog', lambda d: d.accept())
    page.locator('#parse-import').click()
    assert page.locator('#field-name').input_value() == 'Joana Silva'
    assert page.locator('#field-email').input_value() == 'joana@example.com'
    assert page.locator('#pv-name').inner_text() == 'Joana Silva'
    assert page.locator('#pv-objective').inner_text() == 'Atendente'
    assert page.locator('#pv-summary-wrap').is_visible()
    assert page.locator('#pv-exp-wrap').is_hidden()
    # Apagar campos após importação deve retirar o conteúdo da prévia.
    page.locator('#field-objective').fill('')
    assert page.locator('#pv-objective').is_hidden()
    page.locator('#field-objective').fill('Atendente')
    # O botão de PDF chama a impressão e o modo print esconde elementos do editor.
    page.evaluate('() => {window.__print_called = 0; window.print = () => { window.__print_called++; };}')
    page.locator('#print-button').click()
    assert page.evaluate('window.__print_called') == 1
    page.emulate_media(media='print')
    assert page.locator('#resume-preview').is_visible()
    assert not page.locator('#screen-home').is_visible()
    assert not page.locator('#resume-form').is_visible()
    assert 'Cargo ou área de interesse' not in page.locator('#resume-preview').inner_text()
    page.emulate_media(media='screen')
    # Exercita importação DOCX, inclusive descompressão e extração no navegador.
    with tempfile.TemporaryDirectory() as tmp:
        fp = Path(tmp) / 'exemplo.docx'
        doc=Document()
        doc.add_paragraph('Ana Exemplo')
        doc.add_paragraph('ana@exemplo.com')
        doc.add_paragraph('OBJETIVO')
        doc.add_paragraph('Auxiliar de atendimento')
        doc.save(fp)
        page.locator('#tab-import').click()
        page.locator('#file-import').set_input_files(str(fp))
        page.wait_for_function("document.getElementById('import-text').value.includes('Ana Exemplo')")
        assert 'Auxiliar de atendimento' in page.locator('#import-text').input_value()
    # Regressão: não misturar escola com cursos e habilidades.
    case = """Pessoa Exemplo da Silva
pessoa@example.com
(61) 99222-3333
OBJETIVO
Busco oportunidade para desenvolver habilidades, adquirir experiência e contribuir com a equipe.
FORMAÇÃO ACADÊMICA
Ensino Médio Tech - cursando
C.E.H.R - Colégio Estadual Hélio Roriz
Ensino médio com formação complementar em tecnologia, informática e desenvolvimento de competências digitais.
CURSOS E APRIMORAMENTOS
Curso de Informática Básica
Rede Unike - Presencial
Carga horária: 74 horas
Conteúdo: Word, Excel e internet
Curso de Rotinas Administrativas
Rede Unike - Presencial
Carga horária: 40 horas
Conteúdo: Departamento pessoal
Curso de Inclusividade
Escola Virtual - Online
Conteúdo: Respeito à diversidade
Curso de Redação para Concurso
Kultivi - Online
Conteúdo: Técnicas de escrita
HABILIDADES
Facilidade de aprendizado
Boa comunicação
Organização e proatividade
Facilidade de adaptação
Conhecimento básico em informática"""
    page.locator('#tab-import').click()
    page.locator('#import-text').fill(case)
    page.once('dialog',lambda d:d.accept())
    page.locator('#parse-import').click()
    assert page.locator('#field-summary').input_value().startswith('Busco oportunidade')
    assert page.locator('#field-objective').input_value() == ''
    assert page.locator('#education-list .repeat-card').count() == 1
    assert page.locator('#education-list [data-key="course"]').input_value() == 'Ensino Médio Tech'
    assert 'C.E.H.R' in page.locator('#education-list [data-key="institution"]').input_value()
    assert 'formação complementar' in page.locator('#education-list [data-key="description"]').input_value()
    assert 'Curso de Informática Básica' in page.locator('#field-courses').input_value()
    assert 'Curso de Rotinas Administrativas' in page.locator('#field-courses').input_value()
    assert 'Cursos e aprimoramentos' not in page.locator('#field-courses').input_value()
    assert len(page.locator('#field-courses').input_value().splitlines()) == 4
    assert 'Cursos e aprimoramentos' not in page.locator('#pv-education').inner_text()
    assert 'Facilidade de adaptação' in page.locator('#pv-skills').inner_text()
    assert page.locator('#pv-courses-wrap').is_visible()
    assert page.locator('#pv-objective').is_hidden() # O objetivo da amostra é um resumo, não um cargo.
    assert page.locator('#pv-objective').inner_text() == ''
    page.locator('#tab-import').click()
    assert '4 curso(s)' in page.locator('#import-analysis').inner_text()
    # Regressão em navegador: três experiências importadas e exibidas separadamente.
    experience_case = """Pessoa Teste da Silva
pessoa@example.com
EXPERIÊNCIA PROFISSIONAL
Restaurante Exemplo (De setembro de 2023 até dezembro de 2023)
Cargo / Função: Operadora de caixa
Atividades executadas:
Policlínica Exemplo (De janeiro de 2024 outubro de 2024)
Cargo / Função: Estagiária call center e recepção
Atividades executadas:
Atendimento telefônico.
Comércio Exemplo (De março de 2022 até agosto de 2022)
Cargo / Função: Estagiária
Atividades executadas:
HABILIDADES
Comunicação"""
    page.locator('#tab-import').click()
    page.locator('#import-text').fill(experience_case)
    page.once('dialog',lambda d:d.accept())
    page.locator('#parse-import').click()
    assert page.locator('#experiences-list .repeat-card').count() == 3
    assert page.locator('#pv-experiences .resume-entry').count() == 3
    assert page.locator('#experiences-list [data-key="company"]').evaluate_all('(els)=>els.map(el=>el.value)') == ['Restaurante Exemplo', 'Policlínica Exemplo', 'Comércio Exemplo']
    assert page.locator('#experiences-list [data-key="startDate"]').evaluate_all('(els)=>els.map(el=>el.value)') == ['2023-09', '', '2022-03']
    assert page.locator('#experiences-list [data-key="endDate"]').evaluate_all('(els)=>els.map(el=>el.value)') == ['2023-12', '', '2022-08']
    assert 'Período original para conferência' in page.locator('#experiences-list .repeat-card').nth(1).inner_text()
    assert '09/2023 – 12/2023' in page.locator('#pv-experiences').inner_text()
    # Substituir uma data ambígua por datas selecionadas preserva os demais vínculos.
    page.locator('#experiences-list [data-key="startDate"]').nth(1).fill('2024-01')
    assert 'Período original para conferência' in page.locator('#experiences-list .repeat-card').nth(1).inner_text()
    page.locator('#experiences-list [data-key="endDate"]').nth(1).fill('2024-10')
    assert '01/2024 – 10/2024' in page.locator('#pv-experiences').inner_text()
    assert 'Período original para conferência' not in page.locator('#experiences-list .repeat-card').nth(1).inner_text()
    assert page.locator('#experiences-list [data-key="role"]').evaluate_all('(els)=>els.map(el=>el.value)')[0] == 'Operadora de caixa'
    assert 'Atividades executadas:' not in page.locator('#pv-experiences').inner_text()
    assert page.locator('#pv-experiences').inner_text().count('Estagiária') == 2
    # Modificar apenas o cargo do segundo vínculo não pode alterar os demais.
    page.locator('#experiences-list [data-key="role"]').nth(1).fill('Recepcionista')
    assert page.locator('#pv-experiences .resume-entry').nth(1).inner_text().startswith('Recepcionista')
    assert page.locator('#pv-experiences .resume-entry').nth(0).inner_text().startswith('Operadora de caixa')
    page.locator('#tab-import').click()
    assert '3 experiência(s)' in page.locator('#import-analysis').inner_text()
    assert 'Confira estes períodos' in page.locator('#import-analysis').inner_text()
    # Regressão do relato: cada linha Empresa – Cargo inicia um vínculo distinto,
    # desde que a linha seguinte traga um período válido em mês/ano.
    separated_case = """Pessoa de Exemplo
pessoa@example.com
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
Ensino Médio Completo"""
    page.locator('#tab-import').click()
    page.locator('#import-text').fill(separated_case)
    page.once('dialog',lambda d:d.accept())
    page.locator('#parse-import').click()
    assert page.locator('#experiences-list .repeat-card').count() == 3
    assert page.locator('#pv-experiences .resume-entry').count() == 3
    assert page.locator('#experiences-list [data-key="company"]').evaluate_all('(els)=>els.map(el=>el.value)') == ['Restaurante Modelo','Policlínica Modelo','Loja Modelo']
    assert page.locator('#experiences-list [data-key="role"]').evaluate_all('(els)=>els.map(el=>el.value)') == ['Operadora de Caixa','Estagiária Call Center e Recepção','Estagiária Administrativa']
    assert page.locator('#experiences-list [data-key="startDate"]').evaluate_all('(els)=>els.map(el=>el.value)') == ['2025-04','2024-01','2023-09']
    assert page.locator('#experiences-list [data-key="endDate"]').evaluate_all('(els)=>els.map(el=>el.value)') == ['2025-06','2024-10','2023-12']
    assert page.locator('#pv-experiences').inner_text().count('Atendimento ao público') == 1
    assert '04/2025 – 06/2025' in page.locator('#pv-experiences').inner_text()
    assert '01/2024 – 10/2024' in page.locator('#pv-experiences').inner_text()
    assert '09/2023 – 12/2023' in page.locator('#pv-experiences').inner_text()
    # Print CSS presence / no data leak
    assert page.locator('script[src^="https://"]').count() == 0
    assert page.locator('#field-phone').count() == 1
    assert not errors, errors
    page.evaluate("document.getElementById('toast').hidden = true")
    page.screenshot(path=str(root / 'preview-desktop.png'), full_page=True)
    mobile=browser.new_page(viewport={"width": 390, "height": 844},device_scale_factor=1)
    load_app(mobile)
    mobile.locator('#start-create').click()
    assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2')
    mobile.screenshot(path=str(root / 'preview-mobile.png'), full_page=True)
    home=browser.new_page(viewport={"width": 1365, "height": 900})
    load_app(home)
    home.screenshot(path=str(root / 'preview-home.png'), full_page=True)
    print('OK: criar, editar, revisar, importar texto/DOCX e visualização responsiva sem erros JavaScript.')
    browser.close()
