# Publicar no GitHub Pages

O script `scripts/publish-pages.sh` faz o build de produção e publica somente a saída estática na raiz da branch `gh-pages`. O código-fonte e arquivos de desenvolvimento permanecem na branch de trabalho.

## Primeiro uso

1. Garanta que o repositório tenha um remoto gravável chamado `origin` e que o Git tenha `user.name` e `user.email` configurados.
2. Rode, a partir da raiz do projeto:

   ```bash
   ./scripts/publish-pages.sh
   ```

   O script cria `gh-pages` se ela não existir. Nas execuções seguintes, ele substitui o conteúdo da branch pelos arquivos do build atual, adiciona `.nojekyll` e cria `404.html` a partir de `index.html` para links internos do Angular continuarem funcionando.

3. Para publicar em outro nome de branch ou remoto:

   ```bash
   ./scripts/publish-pages.sh pages production
   ```

## Base URL

Para um site de usuário/organização ou domínio próprio, use a raiz:

```bash
./scripts/publish-pages.sh
```

Para um site de projeto em `https://<usuario>.github.io/<repositorio>/`, informe o nome do repositório:

```bash
BASE_HREF="/<repositorio>/" ./scripts/publish-pages.sh
```

Opcionalmente, para preservar um domínio próprio na branch publicada:

```bash
PAGES_CNAME="app.exemplo.com" ./scripts/publish-pages.sh
```

## Configuração no GitHub

1. Abra o repositório no GitHub e acesse **Settings → Pages**.
2. Em **Build and deployment**, selecione **Deploy from a branch**.
3. Selecione a branch **gh-pages** e a pasta **/(root)**.
4. Clique em **Save**.
5. Depois do primeiro push, o GitHub mostra a URL pública nessa mesma página. Os deploys seguintes são acionados pelo script ao fazer push na branch.

O GitHub Pages aceita uma branch e a pasta raiz como fonte de publicação; `.nojekyll` é a forma recomendada para servir diretamente um build estático. Consulte a [documentação oficial do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) se precisar configurar domínio próprio ou permissões.
