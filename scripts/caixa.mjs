// Leitura da lista oficial de imóveis da Caixa (CSV por estado).
// Nada é inventado: campos que o arquivo não traz ficam null ("Não informado").

export const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];

export function normalizar(s) {
  return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function parseValorBR(s) {
  const t = String(s ?? '').replace(/[R$\s]/g, '').trim();
  if (!t) return null;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) ? n : null;
}

export function tituloCidade(s) {
  const minusc = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'd']);
  return String(s ?? '').toLowerCase().split(/\s+/).filter(Boolean)
    .map((p, i) => (i > 0 && minusc.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(' ');
}

function splitLinha(linha, sep = ';') {
  const out = [];
  let atual = '';
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') { if (aspas && linha[i + 1] === '"') { atual += '"'; i++; } else aspas = !aspas; }
    else if (c === sep && !aspas) { out.push(atual); atual = ''; } else atual += c;
  }
  out.push(atual);
  return out.map((s) => s.trim());
}

const REGRAS = [
  ['rurais', / (rural|gleba|fazenda|chacara|sitio) /],
  ['comerciais', / (loja|sala|galpao|predio|comercial|escritorio|deposito|hotel) /],
  ['terrenos', / (terreno|lote) /],
  ['residenciais', / (casa|apartamento|sobrado|kitnet|flat|residencial) /],
];
// O tipo vem antes da 1ª vírgula ("Casa, ... área do terreno"); o texto inteiro confundiria casa com terreno.
export function categorizar(descricao) {
  const tipo = ' ' + normalizar(String(descricao ?? '').split(',')[0]) + ' ';
  for (const [cat, re] of REGRAS) if (re.test(tipo)) return cat;
  const resto = ' ' + normalizar(descricao).replace(/area (do terreno|total|privativa)/g, '') + ' ';
  for (const [cat, re] of REGRAS) if (re.test(resto)) return cat;
  return 'outros';
}

function linkCaixa(u) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && (url.hostname === 'caixa.gov.br' || url.hostname.endsWith('.caixa.gov.br')) ? url.toString() : null;
  } catch { return null; }
}

export function parseCsvCaixa(texto, ufArquivo) {
  const linhas = String(texto).split(/\r?\n/);
  const idx = linhas.findIndex((l) => {
    const n = normalizar(l);
    return n.includes('imovel') && n.includes('cidade') && /(^| )uf( |$)/.test(n);
  });
  if (idx < 0) throw new Error('Cabeçalho do CSV da Caixa não reconhecido — o formato pode ter mudado.');
  const cab = splitLinha(linhas[idx]).map(normalizar);
  const col = (...k) => cab.findIndex((c) => k.some((x) => c.includes(x)));
  const ci = {
    id: col('n do imovel', 'numero do imovel', 'imovel'), uf: cab.findIndex((c) => c === 'uf'), cidade: col('cidade'),
    bairro: col('bairro'), endereco: col('endereco'), preco: col('preco'), avaliacao: col('avaliacao'),
    desconto: col('desconto'), descricao: col('descricao'), modalidade: col('modalidade'), link: col('link'),
  };
  for (const k of ['id', 'uf', 'cidade', 'preco']) if (ci[k] < 0) throw new Error(`Coluna "${k}" ausente no CSV da Caixa.`);

  const out = [];
  for (const linha of linhas.slice(idx + 1)) {
    if (!linha.trim()) continue;
    const c = splitLinha(linha);
    const v = (k) => (ci[k] >= 0 ? (c[ci[k]] ?? '').trim() : '');
    const id = v('id').replace(/\D/g, '');
    const uf = (v('uf') || ufArquivo || '').toUpperCase();
    if (!id || !UFS.includes(uf)) continue;
    const descricao = v('descricao') || null;
    const preco = parseValorBR(v('preco'));
    const avaliacao = parseValorBR(v('avaliacao'));
    let desconto = parseValorBR(v('desconto'));
    if (desconto == null && preco && avaliacao && avaliacao > preco) desconto = Math.round((1 - preco / avaliacao) * 10000) / 100;
    out.push({
      id, uf,
      cidade: tituloCidade(v('cidade')),
      bairro: tituloCidade(v('bairro')) || null,
      endereco: v('endereco') || null,
      preco, avaliacao,
      desconto: desconto != null && desconto > 0 && desconto < 100 ? desconto : null,
      descricao,
      tipo: descricao ? tituloCidade(descricao.split(',')[0].trim()) : 'Imóvel',
      categoria: categorizar(descricao),
      modalidade: v('modalidade') || null,
      link: linkCaixa(v('link')),
    });
  }
  return out;
}
