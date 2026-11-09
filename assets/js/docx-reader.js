/* Leitor local de DOCX (ZIP/XML). Sem upload, sem dependências externas.
 * Compatível com navegadores modernos que implementam DecompressionStream('deflate-raw').
 */
(function () {
  'use strict';
  const decoder = new TextDecoder('utf-8');
  function readU16(view, offset) { return view.getUint16(offset, true); }
  function readU32(view, offset) { return view.getUint32(offset, true); }
  function findCentralDirectory(view) {
    // End of central directory signature; the ZIP comment is at most 65535 bytes.
    const min = Math.max(0, view.byteLength - 22 - 65535);
    for (let i = view.byteLength - 22; i >= min; i--) {
      if (readU32(view, i) === 0x06054b50) return i;
    }
    throw new Error('O arquivo não parece ser um DOCX válido.');
  }
  function findEntry(view, sought) {
    const end = findCentralDirectory(view);
    const count = readU16(view, end + 10);
    const start = readU32(view, end + 16);
    let pos = start;
    for (let n = 0; n < count; n++) {
      if (pos + 46 > view.byteLength || readU32(view, pos) !== 0x02014b50) throw new Error('Estrutura DOCX inválida.');
      const compression = readU16(view, pos + 10);
      const compressedSize = readU32(view, pos + 20);
      const uncompressedSize = readU32(view, pos + 24);
      const filenameLength = readU16(view, pos + 28);
      const extraLength = readU16(view, pos + 30);
      const commentLength = readU16(view, pos + 32);
      const localOffset = readU32(view, pos + 42);
      const filename = decoder.decode(new Uint8Array(view.buffer, view.byteOffset + pos + 46, filenameLength));
      if (filename === sought) return { compression, compressedSize, uncompressedSize, localOffset };
      pos += 46 + filenameLength + extraLength + commentLength;
    }
    throw new Error('Não encontrei o conteúdo de texto deste DOCX.');
  }
  async function readZipEntry(arrayBuffer, filename) {
    const view = new DataView(arrayBuffer);
    const entry = findEntry(view, filename);
    if (entry.uncompressedSize > 10_000_000) throw new Error('O documento possui conteúdo muito grande.');
    const pos = entry.localOffset;
    if (pos + 30 > view.byteLength || readU32(view, pos) !== 0x04034b50) throw new Error('Estrutura ZIP inválida.');
    const filenameLength = readU16(view, pos + 26);
    const extraLength = readU16(view, pos + 28);
    const offset = pos + 30 + filenameLength + extraLength;
    if (offset + entry.compressedSize > arrayBuffer.byteLength) throw new Error('O arquivo está incompleto.');
    const bytes = new Uint8Array(arrayBuffer, offset, entry.compressedSize);
    if (entry.compression === 0) return decoder.decode(bytes);
    if (entry.compression !== 8) throw new Error('Este formato de compressão DOCX não é compatível.');
    if (typeof DecompressionStream !== 'function') throw new Error('Seu navegador não oferece suporte à importação DOCX. Experimente atualizar o navegador ou colar o texto.');
    let stream;
    try { stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')); }
    catch { throw new Error('Não foi possível descompactar o DOCX neste navegador.'); }
    const output = await new Response(stream).arrayBuffer();
    if (output.byteLength > 10_000_000) throw new Error('O documento excede o limite de leitura.');
    return decoder.decode(output);
  }
  async function extractDocx(arrayBuffer) {
    const xml = await readZipEntry(arrayBuffer, 'word/document.xml');
    const dom = new DOMParser().parseFromString(xml, 'application/xml');
    if (dom.getElementsByTagName('parsererror').length) throw new Error('Não foi possível interpretar o texto do DOCX.');
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const paras = Array.from(dom.getElementsByTagNameNS(ns, 'p'));
    const lines = paras.map(p => {
      const walker = dom.createTreeWalker(p, NodeFilter.SHOW_ELEMENT);
      let text = '';
      while (walker.nextNode()) {
        const el = walker.currentNode;
        if (el.namespaceURI !== ns) continue;
        if (el.localName === 't') text += el.textContent;
        else if (el.localName === 'tab') text += '  ';
        else if (el.localName === 'br') text += '\n';
      }
      return text.trim();
    }).filter(Boolean);
    if (!lines.length) throw new Error('O arquivo não contém texto editável. Currículos em imagens não podem ser importados nesta versão.');
    return lines.join('\n');
  }
  window.CurriculoDocx = { extractDocx };
})();
