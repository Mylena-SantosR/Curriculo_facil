# Currículo Fácil

**Versão 1.8 — estilos de currículo Compacto, Padrão e Amplo, incluindo todas as melhorias anteriores.**

**Seu próximo passo começa aqui.**

Aplicação web gratuita para auxiliar pessoas a criar, revisar e formatar currículos profissionais, desenvolvida como projeto de extensão em Sistemas de Informação, alinhado ao **ODS 8 — Trabalho Decente e Crescimento Econômico**.

## Funcionalidades desta versão

- Seleção de três estilos de layout (Compacto, Padrão e Amplo), aplicados imediatamente à pré-visualização e à impressão em PDF. O **Amplo** permanece selecionado inicialmente, como na versão 1.7.

- Criar currículos do zero, com dados de contato, objetivo, perfil, experiências, escolaridade, habilidades e cursos.
- Adicionar e remover experiências profissionais e formações, com campos nativos de data (mês/ano) para início e término/conclusão.
- Marcar “Trabalho aqui atualmente” ou “Ainda estou cursando”; o término é desativado e o currículo exibe `MM/AAAA – Atualmente` ou `MM/AAAA – Em andamento`.
- Pré-visualizar o documento em tempo real, com layout adequado à impressão A4.
- Ocultar automaticamente campos e seções não preenchidos (nome, cargo de interesse, contato, resumo etc.), sem textos demonstrativos no currículo nem no PDF.
- Importar texto de currículos em `.docx` ou `.txt` diretamente no navegador, ou colar texto de outros formatos.
- Reconhecer múltiplos vínculos em Experiência Profissional, separando empresas, cargos, períodos e atividades com base nos títulos e rótulos existentes, sem inventar datas.
- Converter períodos importados claros (como “setembro de 2023 até dezembro de 2023”) para seletores de mês/ano. Quando a data está incompleta, preservar o texto original e solicitar revisão, sem inventar mês.
- Avisar quando o término for anterior ao início e impedir a impressão com essa inconsistência.
- Identificar e separar melhor seções de currículos importados, incluindo **Formação acadêmica**, **Cursos e aprimoramentos**, **Habilidades**, **Experiência** e **Perfil profissional**, com revisão manual obrigatória.
- Organizar cursos em itens independentes, sem uni-los à escolaridade.
- Preservar no texto original informações de seções não reconhecidas, apresentando um alerta para conferência.
- Transferir frases de apresentação, como “Busco oportunidade...”, para o perfil profissional, em vez de cortá-las no campo de cargo desejado.
- Receber lembretes básicos sobre campos ausentes e clareza das informações (não é um corretor gramatical com IA).
- Salvar currículo em **PDF** usando a função de impressão do navegador, com lembrete para desativar “Cabeçalhos e rodapés” e evitar data/URL nas bordas.
- Interface responsiva para celular e computador.

## Executar localmente

1. Extraia o arquivo ZIP e abra `index.html` no Chrome, Edge ou outro navegador moderno.
2. Clique em **Criar meu currículo** ou **Melhorar meu currículo**.
3. Preencha e confira suas informações. Na pré-visualização, escolha **Compacto**, **Padrão** ou **Amplo**.
4. Clique em **Salvar como PDF**. Na janela de impressão, escolha o destino **Salvar como PDF** e desative **Cabeçalhos e rodapés** para remover data, URL e título da página.

Para desenvolver com recarregamento local, opcionalmente execute na pasta do projeto:

```bash
python -m http.server 8000
```

Em seguida acesse `http://localhost:8000`.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub, como `curriculo-facil`.
2. Envie **o conteúdo da pasta**, mantendo `index.html` na raiz do repositório.
3. Acesse **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main` e pasta `/(root)`.
5. Depois da publicação, a URL deverá seguir o formato `https://SEU_USUARIO.github.io/curriculo-facil/`.

## Privacidade e acessibilidade

Os dados digitados e os arquivos importados são processados **localmente no navegador**. A aplicação não inclui banco de dados, envio de currículos, métricas de rastreamento, login ou armazenamento automático. Isso significa que **as informações não permanecem após recarregar ou fechar a página**, a menos que o usuário salve o PDF manualmente.

Evite incluir CPF, RG, endereço completo ou outros dados desnecessários. Para demonstrar a ferramenta, utilize dados fictícios e só fotografe pessoas com autorização.

O sistema não envia currículos para vagas de emprego e não garante contratação.

## Limitações conhecidas

- Importação de PDF não disponível; o texto pode ser copiado e colado.
- Arquivos DOC antigos (`.doc`) não são compatíveis.
- Extração DOCX usa `DecompressionStream('deflate-raw')`, recurso de navegadores modernos. Currículos baseados em imagens não podem ser interpretados.
- A identificação das experiências considera formatos como `Empresa (De janeiro de 2022 até março de 2023)`, `Cargo / Função: ...` e `Atividades executadas:`. Se o campo de atividades estiver vazio, o rótulo não será exibido no currículo.
- A identificação de seções continua **aproximada**. Arquivos com colunas, tabelas, títulos muito incomuns ou formatação complexa podem precisar de correção manual.
- A revisão de textos **não usa IA**; ela preserva dados e separa blocos por regras de reconhecimento.
- As sugestões não substituem revisão humana e não corrigem automaticamente todos os erros de português.
- O PDF é gerado pela ferramenta de impressão do navegador, e a paginação pode variar conforme o dispositivo.

## Aplicação no projeto de extensão

1. Entrevistar presencialmente uma pessoa da comunidade que esteja há algum tempo fora do mercado de trabalho, identificando dificuldades na elaboração do currículo.
2. Desenvolver e ajustar a aplicação de acordo com a necessidade observada.
3. Conduzir uma oficina presencial para elaborar ou atualizar seu currículo.
4. Avaliar se a participante consegue revisar e salvar seu documento.
5. Registrar a atividade com consentimento, documentar resultados reais e disponibilizar a aplicação gratuitamente.

**Importante:** confirmar com o tutor se o atendimento presencial individual cumpre as exigências do componente de extensão.

## Estrutura

```text
curriculo-facil/
├── index.html
├── assets/
│   ├── css/styles.css
│   └── js/
│       ├── app.js
   │       ├── period-utils.js
│       ├── resume-parser.js
│       └── docx-reader.js
├── tests/
│   ├── smoke_test.py
│   └── parser_test.js
├── .nojekyll
└── README.md
```

## Licença

Projeto acadêmico demonstrativo. Antes da publicação para outras pessoas, revise os textos, testes, acessibilidade e instruções de privacidade.

## Testes de desenvolvimento

Os testes automatizados são:

- `node tests/parser_test.js`: regressão de seções e vínculos profissionais, sem dependências externas.
- `node tests/period_test.js`: conversão de datas, formatação mês/ano e datas ambíguas.
- `python tests/smoke_test.py`: criação, edição, revisão, importação DOCX, separação de áreas e layout responsivo. Requer Python, `playwright`, `beautifulsoup4`, `python-docx` e Chromium.


## Correção da v1.6: experiências separadas na importação
- Identifica vínculos quando aparecem como `Empresa – Cargo` seguidos de `Abr/2025 a Jun/2025` na próxima linha.
- Reconhece abreviações de mês nas datas importadas e as converte para os seletores de mês/ano.
- Mantém as atividades somente dentro da experiência correspondente, sem transformar descrições em novos vínculos.
- Arquivos com formatações não reconhecidas ainda devem ser conferidos manualmente.
