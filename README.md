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
- **Atualização automática** todo dia às 05:00 (Brasília).

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
5. Vá em **Actions → Atualizar leilões → Run workflow**. A primeira execução leva alguns minutos.
6. Vá em **Settings → Pages**. Em *Source*, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)**, e clique em **Save**.
7. Em 1 ou 2 minutos o site fica em `https://SEU-USUARIO.github.io/leiloes-brasil/`.

A partir daí, a atualização roda sozinha todo dia. Se uma execução falhar por completo, o GitHub avisa por e-mail **você** (o dono do repositório). O site não envia e-mails a ninguém.

> O GitHub pausa rotinas agendadas em repositórios sem nenhuma atividade por 60 dias. Se isso acontecer, entre em **Actions** e clique em **Enable workflow**.

## Se a Caixa bloquear o download automático
Em **Sobre e fontes**, a tabela mostra os estados com erro. Esses estados continuam exibindo os dados da última atualização que deu certo. Para atualizar manualmente:
1. Baixe o CSV no site da Caixa (venda-imoveis.caixa.gov.br → Download da lista de imóveis), um por estado.
2. No GitHub, envie os arquivos para a pasta `entrada/`, com o nome original (ex.: `Lista_imoveis_PR.csv`).
3. Rode **Actions → Atualizar leilões → Run workflow**. O script usa os arquivos da pasta `entrada/` no lugar do download.

Os arquivos em `entrada/` continuam sendo usados até você apagá-los. Apague-os quando o download automático voltar a funcionar.

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
