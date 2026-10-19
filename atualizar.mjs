// Atualiza os dados do site: baixa a lista oficial de imóveis da Caixa (um CSV por estado)
// e grava arquivos JSON em /dados. Sem banco de dados, sem dependências.
//   node scripts/atualizar.mjs            → todos os estados
//   node scripts/atualizar.mjs PR SC      → só os estados indicados
//   node scripts/atualizar.mjs --somente-entrada → só processa os CSVs da pasta /entrada,
//                                          sem acessar o site da Caixa (modo usado no GitHub)
//   node scripts/atualizar.mjs --pausa=90 → espera 90 s entre estados (padrão: 45 s)
// A Caixa barra pedidos em sequência rápida. Por isso o script vai devagar e,
// se for barrado, espera e tenta de novo (até 2 vezes). Todos os estados levam ~30-40 min.
// Se a Caixa bloquear o download, coloque os CSVs baixados no navegador na pasta /entrada
// (ex.: entrada/Lista_imoveis_PR.csv): o script usa o arquivo local no lugar do download.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UFS, parseCsvCaixa, normalizar } from './caixa.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DADOS = path.join(RAIZ, 'dados');
const ENTRADA = path.join(RAIZ, 'entrada');
const URL_CSV = (uf) => `https://venda-imoveis.caixa.gov.br/listaweb/Lista_imoveis_${uf}.csv`;
const URL_MUNICIPIOS = 'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv';
const CODIGO_UF = { 11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF' };

// Ordem fixa dos campos em cada registro (arrays deixam os arquivos bem menores)
export const CAMPOS = ['id', 'cidade', 'bairro', 'endereco', 'preco', 'avaliacao', 'desconto', 'tipo', 'categoria', 'modalidade', 'descricao', 'link', 'lat', 'lng', 'novoEm'];

const hojeBR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const lerJson = (arq, padrao) => { try { return JSON.parse(fs.readFileSync(arq, 'utf8')); } catch { return padrao; } };
const gravar = (arq, obj) => fs.writeFileSync(arq, JSON.stringify(obj));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function municipios() {
  const arq = path.join(DADOS, 'municipios.json');
  let lista = lerJson(arq, null);
  if (!lista) {
    console.log('Baixando coordenadas dos municípios (IBGE)…');
    const texto = await (await fetch(URL_MUNICIPIOS, { signal: AbortSignal.timeout(60000) })).text();
    const [cab, ...linhas] = texto.trim().split(/\r?\n/);
    const c = cab.split(',');
    const [iNome, iLat, iLng, iUf] = ['nome', 'latitude', 'longitude', 'codigo_uf'].map((n) => c.indexOf(n));
    if ([iNome, iLat, iLng, iUf].some((i) => i < 0)) throw new Error('Formato do arquivo de municípios mudou.');
    lista = linhas.map((l) => l.split(',')).filter((x) => CODIGO_UF[x[iUf]])
      .map((x) => [x[iNome], CODIGO_UF[x[iUf]], Number(Number(x[iLat]).toFixed(4)), Number(Number(x[iLng]).toFixed(4))])
      .sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));
    gravar(arq, lista);
  }
  return new Map(lista.map(([nome, uf, lat, lng]) => [`${uf}|${normalizar(nome)}`, [lat, lng]]));
}

const PAUSA_S = Number(process.argv.find((a) => a.startsWith('--pausa='))?.split('=')[1]) || 45;

async function obterCsvComPaciencia(uf) {
  if (fs.existsSync(path.join(ENTRADA, `Lista_imoveis_${uf}.csv`))) return obterCsv(uf);
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await obterCsv(uf);
    } catch (e) {
      if (tentativa >= 3) throw e;
      const espera = PAUSA_S * 2 * tentativa;
      console.log(`${uf}: ${e.message}. Esperando ${espera} s para tentar de novo (${tentativa + 1}ª tentativa)…`);
      await esperar(espera * 1000);
    }
  }
}

async function obterCsv(uf) {
  const local = path.join(ENTRADA, `Lista_imoveis_${uf}.csv`);
  if (fs.existsSync(local)) return { texto: fs.readFileSync(local).toString('latin1'), origem: 'arquivo enviado' };
  const r = await fetch(URL_CSV(uf), {
    headers: { 'User-Agent': 'LeiloesBrasil/1.0 (consulta diaria de lista publica)', Accept: 'text/csv,text/plain,*/*' },
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const texto = Buffer.from(await r.arrayBuffer()).toString('latin1');
  if (/^\s*</.test(texto)) throw new Error('a Caixa devolveu uma página em vez do arquivo (possível bloqueio)');
  return { texto, origem: 'download automático' };
}

async function main() {
  fs.mkdirSync(DADOS, { recursive: true });
  const pedidos = process.argv.slice(2).filter((a) => !a.startsWith('--')).map((s) => s.toUpperCase()).filter((u) => UFS.includes(u));
  const somenteEntrada = process.argv.includes('--somente-entrada');
  let ufs = pedidos.length ? pedidos : UFS;
  if (somenteEntrada) {
    const arquivos = fs.existsSync(ENTRADA) ? fs.readdirSync(ENTRADA) : [];
    ufs = ufs.filter((u) => arquivos.includes(`Lista_imoveis_${u}.csv`));
    if (!ufs.length) { console.log('Nenhum CSV na pasta entrada/. Nada a fazer.'); return; }
    console.log(`Processando arquivos enviados: ${ufs.join(', ')}`);
  }
  const hoje = hojeBR();
  const geo = await municipios().catch((e) => {
    console.warn(`Aviso: sem coordenadas das cidades (${e.message}). O filtro por raio não vai funcionar até a próxima execução.`);
    return new Map();
  });
  const indice = lerJson(path.join(DADOS, 'indice.json'), { ufs: {} });
  indice.primeiraCarga ??= hoje;
  // no modo por arquivo não há tentativa de download: limpa avisos de bloqueio antigos
  if (somenteEntrada) for (const v of Object.values(indice.ufs)) v.erro = null;

  for (const uf of ufs) {
    const arqUf = path.join(DADOS, `${uf}.json`);
    const anterior = lerJson(arqUf, null);
    const vistoAntes = new Map((anterior?.itens || []).map((r) => [r[0], r[CAMPOS.indexOf('novoEm')]]));
    try {
      const { texto, origem } = await obterCsvComPaciencia(uf);
      const imoveis = parseCsvCaixa(texto, uf).filter((x) => x.uf === uf);
      if (!imoveis.length && anterior?.itens?.length > 20) throw new Error('arquivo veio vazio; mantidos os dados anteriores');

      // prefixo comum dos links, para não repetir a mesma URL milhares de vezes
      const exemplo = imoveis.find((x) => x.link && x.link.endsWith(x.id));
      const prefixo = exemplo ? exemplo.link.slice(0, -exemplo.id.length) : null;
      let semGeo = 0;
      const vistos = new Set();
      const itens = [];
      for (const x of imoveis) {
        if (vistos.has(x.id)) continue;
        vistos.add(x.id);
        const g = geo.get(`${uf}|${normalizar(x.cidade)}`);
        if (!g) semGeo++;
        const novoEm = vistoAntes.get(x.id) ?? hoje;
        const link = x.link && prefixo && x.link === prefixo + x.id ? 1 : x.link;
        itens.push([x.id, x.cidade, x.bairro, x.endereco, x.preco, x.avaliacao, x.desconto, x.tipo, x.categoria,
          x.modalidade, x.descricao, link, g?.[0] ?? null, g?.[1] ?? null, novoEm]);
      }
      const novos = anterior ? itens.filter((r) => !vistoAntes.has(r[0])).length : 0;
      const sairam = anterior ? [...vistoAntes.keys()].filter((id) => !vistos.has(id)).length : 0;
      gravar(arqUf, { uf, atualizadoEm: new Date().toISOString(), linkPrefixo: prefixo, campos: CAMPOS, itens });
      indice.ufs[uf] = { total: itens.length, atualizadoEm: new Date().toISOString(), origem, erro: null, novosHoje: novos, sairamHoje: sairam, semLocalizacao: semGeo };
      console.log(`${uf}: ${itens.length} imóveis (${novos} novos, ${sairam} sairam da lista) — ${origem}`);
    } catch (e) {
      indice.ufs[uf] = { ...(indice.ufs[uf] || { total: anterior?.itens?.length || 0 }), erro: `${new Date().toISOString().slice(0, 10)}: ${e.message}` };
      console.error(`${uf}: ERRO — ${e.message}`);
    }
    if (!somenteEntrada && ufs.length > 1 && uf !== ufs[ufs.length - 1]) {
      console.log(`Aguardando ${PAUSA_S} s antes do próximo estado…`);
      await esperar(PAUSA_S * 1000); // a Caixa barra downloads em sequência rápida
    }
  }

  // totais por categoria (para a página inicial)
  const porCategoria = {};
  let total = 0;
  for (const uf of UFS) {
    const d = lerJson(path.join(DADOS, `${uf}.json`), null);
    for (const r of d?.itens || []) { porCategoria[r[8]] = (porCategoria[r[8]] || 0) + 1; total++; }
  }
  Object.assign(indice, { atualizadoEm: new Date().toISOString(), total, porCategoria });
  gravar(path.join(DADOS, 'indice.json'), indice);
  const erros = Object.entries(indice.ufs).filter(([, v]) => v.erro);
  console.log(`Total: ${total} imóveis. Estados com erro: ${erros.length ? erros.map(([u]) => u).join(', ') : 'nenhum'}`);
  if (erros.length === UFS.length) process.exitCode = 1; // tudo falhou: o GitHub avisa por e-mail
}

main().catch((e) => { console.error(e); process.exit(1); });
