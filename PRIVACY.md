# Política de Privacidade — Baixar Portarias do SUAP (IFMT)

Última atualização: 2026-07-13

## Resumo

Esta extensão **não coleta, não armazena e não compartilha** nenhum dado pessoal.
Todo o processamento acontece **localmente**, dentro do seu navegador, usando a
sessão que você já tem autenticada no SUAP.

## O que a extensão faz

- Lê a lista de portarias exibida na página do servidor no SUAP
  (`https://suap.ifmt.edu.br`), percorrendo a paginação.
- Para cada portaria selecionada, solicita ao próprio SUAP a geração do PDF e
  baixa o arquivo para a sua pasta de Downloads.

## Dados

- **Coleta de dados:** nenhuma.
- **Transmissão de dados:** nenhuma para servidores de terceiros. As únicas
  requisições feitas são para `https://suap.ifmt.edu.br`, o mesmo sistema em que
  você já está logado, para listar e baixar as suas portarias.
- **Armazenamento:** os PDFs são salvos apenas na sua pasta de Downloads, por sua
  ação. A extensão não guarda histórico, credenciais ou qualquer informação.
- **Cookies/credenciais:** a extensão não lê nem manipula suas credenciais. Ela
  apenas aproveita a sessão já ativa do navegador para acessar o SUAP.

## Permissões e justificativas

- `downloads`: salvar os PDFs diretamente, sem a caixa "Salvar como".
- `host_permissions: https://suap.ifmt.edu.br/*`: acessar exclusivamente o SUAP
  para listar e baixar as portarias.

## Contato

Dúvidas sobre privacidade podem ser encaminhadas ao mantenedor do repositório.
