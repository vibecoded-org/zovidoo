# Configurando exercícios

O ponto único de configuração é [exercise-catalog.config.ts](../src/app/core/exercise-catalog.config.ts).

Cada item em `EXERCISE_CATALOG` define a apresentação e o fluxo de um exercício:

- `questionCount`, `icon`, `answerMode` e `flow`;
- `enabled: false` para desativar temporariamente o tipo no menu, Quick Practice e URLs diretas, sem apagar seu histórico ou domínio;
- `levels[1..5]`, com conteúdo disponível, quantidade de escolhas, proximidade dos distratores e, para progressões, o tamanho;
- `generator`, que liga a configuração a um gerador musical já existente.

O mesmo arquivo contém `exerciseTranslationKey`, centralizando a ligação com os títulos, descrições e registros de histórico traduzidos.

## Desativar um exercício

No item desejado do catálogo, acrescente a flag abaixo. A ausência da flag equivale a `true`.

```ts
rhythm: {
  id: 'rhythm',
  enabled: false,
  // restante da configuração...
}
```

Isso remove o exercício da lista de prática e do Quick Practice e redireciona uma URL direta, como `/practice/rhythm`, para a lista. O progresso e o histórico já gravados são preservados.

As opções musicais ficam em `EXERCISE_CONTENT`: notas, intervalos, tonalidades, raízes, progressões, cadências e padrões rítmicos. Adicionar uma cadência, por exemplo, é incluir `{ key, degrees }` nesse catálogo e criar a respectiva tradução.

Para adicionar um tipo completamente novo, siga esta sequência:

1. Inclua o identificador em `ExerciseType` e `EXERCISE_TYPES` em `models.ts`.
2. Crie sua entrada no `EXERCISE_CATALOG`, com os cinco perfis de nível.
3. Acrescente um caso no `ExerciseEngineService` para gerar áudio, resposta e explicação.
4. Adicione as strings nos três idiomas em `translation.service.ts`.

As páginas, sessões, Quick Practice, domínio e histórico derivam o fluxo do catálogo e não precisam de alterações para ajustes de configuração existentes.
