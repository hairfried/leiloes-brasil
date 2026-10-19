# Leilões Brasil — versão de consulta (sem banco de dados)

Site para consultar leilões, sem cadastro, sem banco de dados e sem envio de e-mails. Hospedagem e atualização gratuitas pelo GitHub.

## O que tem
- **Buscar imóveis:** todos os imóveis da lista oficial da Caixa, do Brasil inteiro. É possível filtrar por:
  - palavras-chave (incluir ou excluir);
  - tipo de imóvel;
  - estados ou regiões;
  - **distância em km a partir de uma cidade**;
  - preço e desconto;
  - forma de venda (leilão, licitação, venda online, venda direta);
  - imóveis que entraram na lista recentemente.
- **Detalhe do imóvel** com link direto para a página dele na Caixa (fotos, edital, matrícula e data).
- **Central de leilões:** bancos, leiloeiras nacionais, veículos, Receita Federal e, para o estado escolhido, pesquisas prontas de Detran, Tribunal de Justiça, Justiça do Trabalho, Junta Comercial, governo e prefeituras.
- **Favoritos**, salvos só no navegador de cada pessoa.
- **Atualização em poucos cliques:** você baixa as listas da Caixa e envia para o GitHub, que gera o site sozinho.

## Limites (para não haver surpresa)
- A lista da Caixa **não traz data do leilão nem fotos**. Essas informações ficam no link de cada imóvel.
- Veículos, máquinas e leilões judiciais **não** aparecem na busca, porque esses sites não oferecem uma lista pública para consulta automática. Eles estão acessíveis pela Central de leilões.

## Importante: abra pelo endereço do site
Abrir o `index.html` direto do celular ou da pasta do computador **não carrega os imóveis**. Os navegadores bloqueiam a leitura dos dados quando a página é aberta como arquivo. O site funciona pelo endereço publicado (passos abaixo).

## Como publicar (uma vez, uns 15 minutos)
1. Crie uma conta grátis em https://github.com (se ainda não tiver).
2. Clique em **New repository** e dê o nome `leiloes-brasil`. Deixe como **Public**, porque o GitHub Pages grátis exige repositório público.
3. Na página do repositório, clique em **Add file → Upload files** e arraste **todo o conteúdo** desta pasta, incluindo a pasta `.github`. Depois clique em **Commit changes**.
   - Se o navegador não enviar a pasta `.github` (ela começa com ponto e fica oculta), crie o arquivo manualmente: **Add file → Create new file**, com o nome `.github/workflows/atualizar.yml`, e cole o conteúdo do arquivo de mesmo nome.
4. Vá em **Settings → Actions → General → Workflow permissions**, marque **Read and write permissions** e clique em **Save**.
5. Envie as listas da Caixa para a pasta `entrada/` (veja “Como atualizar os dados”).
6. Vá em **Settings → Pages**. Em *Source*, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)**, e clique em **Save**.
7. Em 1 ou 2 minutos o site fica em `https://SEU-USUARIO.github.io/leiloes-brasil/`.

Se uma execução falhar, o GitHub avisa **você** (o dono do repositório) por e-mail. O site não envia e-mails a ninguém.

## Como atualizar os dados (a Caixa bloqueia download automático)
Nos testes, a Caixa entregou o primeiro arquivo e bloqueou os seguintes, tanto pelo GitHub quanto por um computador comum, mesmo com longas pausas. Por isso a atualização funciona assim:
1. No site, abra **Sobre e fontes** e clique nos estados que quer atualizar. O navegador baixa a lista oficial (`Lista_imoveis_PR.csv` etc.).
2. No GitHub, abra a pasta **entrada**, clique em **Add file → Upload files**, arraste os arquivos (sem renomear) e clique em **Commit changes**.
3. A rotina roda sozinha e o site atualiza em 1 a 2 minutos.

Enviar de novo um arquivo com o mesmo nome substitui o anterior. Estados que você não enviar continuam com os últimos dados. A data de cada um aparece em Sobre e fontes.

## Rodar no seu computador (opcional)
Requer Node.js 20 ou mais novo.
```
node --test test/*.mjs        # testes
node scripts/atualizar.mjs PR # atualiza só o Paraná (sem argumento = todos)
npx serve .                   # abre o site em http://localhost:3000
```

## Estrutura
```
index.html                    o site inteiro (visual e funcionamento num só arquivo)
                              a lista da Central fica em index.html, no bloco GRUPOS
scripts/atualizar.mjs         baixa as listas e gera os arquivos em dados/
scripts/caixa.mjs             leitura do CSV da Caixa
dados/                        gerado automaticamente (um JSON por estado + índice + municípios)
entrada/                      CSVs enviados manualmente (opcional)
.github/workflows/            rotina diária do GitHub
test/                         testes
```

## Incluir um portal na Central
Abra `index.html`, procure por `const GRUPOS` e acrescente uma linha no grupo certo:
`['Nome', 'https://site-oficial.com.br', 'Descrição curta'],`
