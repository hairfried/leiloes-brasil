import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { parseCsvCaixa, categorizar } from '../scripts/caixa.mjs';

const texto = fs.readFileSync(new URL('./fixtures/caixa_pr.csv', import.meta.url)).toString('latin1');

test('lê o CSV ignorando o preâmbulo e linhas sem número', () => {
  const l = parseCsvCaixa(texto, 'PR');
  assert.strictEqual(l.length, 4);
  assert.strictEqual(l[0].id, '8555512345678');
  assert.strictEqual(l[0].cidade, 'Campo Mourao');
  assert.strictEqual(l[0].preco, 180000);
  assert.strictEqual(l[0].desconto, 28);
  assert.strictEqual(l[0].categoria, 'residenciais');
});
test('calcula desconto só com preço e avaliação da fonte', () => assert.strictEqual(parseCsvCaixa(texto, 'PR')[1].desconto, 29.83));
test('descarta link fora do domínio da Caixa', () => assert.strictEqual(parseCsvCaixa(texto, 'PR')[2].link, null));
test('categorias', () => {
  assert.strictEqual(parseCsvCaixa(texto, 'PR')[2].categoria, 'terrenos');
  assert.strictEqual(parseCsvCaixa(texto, 'PR')[3].categoria, 'rurais');
  assert.strictEqual(categorizar('Loja, 40 m²'), 'comerciais');
});
test('erro claro se o formato mudar', () => assert.throws(() => parseCsvCaixa('a;b\n1;2', 'PR'), /Cabeçalho/));
