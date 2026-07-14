# Baixar Portarias do SUAP (IFMT)

Extensão de navegador (Chrome/Edge) que baixa **em lote** as portarias de um
servidor no [SUAP/IFMT](https://suap.ifmt.edu.br), cada arquivo já nomeado como
`numero-ano.pdf` (ex.: `119-2026.pdf`).

Sem instalar nada além da extensão, sem terminal e sem a caixa "Salvar como": ela
aproveita o **login que você já tem aberto** no SUAP e salva os PDFs direto na
sua pasta de Downloads.

## Como surgiu

O projeto nasceu de uma necessidade real e de curiosidade pessoal.

Um servidor precisava reunir dezenas de portarias que só ficam disponíveis uma a
uma no SUAP — baixar tudo manualmente era repetitivo e tomava um tempo enorme. A
partir desse pedido, e por vontade própria de entender como resolver isso de um
jeito simples e reaproveitável, resolvi transformar a solução em algo que
qualquer colega pudesse usar com poucos cliques.

A primeira versão foi um script que automatizava o navegador, mas exigia
conhecimento técnico para rodar. A ideia evoluiu para esta **extensão**, que
qualquer pessoa instala uma vez e usa sozinha.

## Como foi desenvolvido

A extensão foi construída observando como o próprio SUAP se comporta no navegador
e **reproduzindo de forma automatizada os mesmos passos que um usuário faria
manualmente**: abrir a lista de portarias, pedir a geração de cada PDF e salvar o
arquivo pronto.

Alguns princípios que guiaram o desenvolvimento:

- **Nada de credenciais.** A extensão nunca lê nem pede login/senha. Ela apenas
  usa a sessão que o próprio usuário já tem ativa no navegador.
- **Nenhum dado sai do seu computador.** Todo o processamento é local; nada é
  coletado, armazenado externamente ou enviado a terceiros.
- **Permissões mínimas.** Só o necessário para baixar arquivos e acessar o
  próprio SUAP.
- **Simplicidade para o usuário final.** Um botão na página, uma lista com
  seleção e um download em lote.

## Como usar

1. Faça login no SUAP e abra a página de um servidor, na aba de portarias.
2. Clique no botão **"Baixar portarias"** (canto inferior direito).
3. A extensão lista **todas** as portarias, inclusive as que estão em outras
   páginas (paginação).
4. Marque as desejadas (ou "Selecionar todas") e clique **"Baixar selecionadas"**.
5. Os PDFs caem em `Downloads/Portarias SUAP/…`, cada um como `numero-ano.pdf`.
6. Ao final, é possível salvar um `_log_download.csv` com o resultado de cada uma.

## Instalação (Chrome ou Edge)

1. Baixe/clone este repositório.
2. Acesse `chrome://extensions` (ou `edge://extensions`).
3. Ative o **Modo do desenvolvedor**.
4. Clique em **"Carregar sem compactação"** e selecione a pasta do projeto.
5. Abra o SUAP e use.

## Distribuição

Pensada para ser compartilhada de graça:

| Opção | Custo | Instalação para o colega |
|---|---|---|
| **Edge Add-ons** (loja da Microsoft) | Grátis | 1 clique (no Edge) |
| **GitHub + "carregar sem compactação"** | Grátis | Manual (passos acima) |
| Chrome Web Store | US$ 5 (taxa única) | 1 clique (no Chrome) |

## Privacidade

Nada é coletado, armazenado externamente ou compartilhado. Todo o processamento
acontece localmente, no seu navegador. Ver [PRIVACY.md](PRIVACY.md).

## Estrutura

```
manifest.json   # Manifest V3
content.js      # UI + coleta da lista (com paginação) + orquestração dos downloads
background.js   # service worker: salva os PDFs via chrome.downloads
panel.css       # estilo do painel injetado
icons/          # ícones 16/32/48/128
tools/          # utilitários (gerador de ícones, empacotador)
```

## Aviso

Projeto independente, sem vínculo oficial com o IFMT, a Google ou a Microsoft.
Feito para facilitar o trabalho de quem já tem acesso às suas próprias portarias.
