# Revisão do projeto — 27/10/2026

Aplicação disponível localmente em http://localhost:3000, com build de produção.

| Verificação | Resultado |
|---|---|
| Build de produção | Aprovado |
| TypeScript | Sem erros |
| ESLint | Sem erros; 1 aviso preexistente de variável não utilizada em src/components/ui/private-lessons.tsx:139 |
| Rotas com navegador real, quatro perfis | 132/132 aprovadas |
| Fluxos com conta temporária | 21/21 aprovados |
| Layout em celular, tablet e desktop | 123 verificações; 0 achados |

## Correções entregues

- Criadas as páginas públicas inicial, login e cadastro que estavam ausentes. Cadastro valida os dados e cria exclusivamente alunos; senhas são armazenadas com hash.
- Corrigida a renderização dos detalhes de curso: removida interação inválida no Server Component e compartilhada a função de rótulos fora do módulo cliente.
- Corrigidos o comando de lint e a conta de aluno de demonstração documentada.
- Encerrados os dois servidores de desenvolvimento que usavam simultaneamente a mesma pasta de compilação. Foi iniciado um único servidor de produção após o build.
- Middleware usa runtime Node.js compatível com as dependências de autenticação e preserva os filtros no retorno ao login.
- Permissões e dados de perfil são consultados no banco, para refletir alterações sem depender de um JWT antigo.
- Busca do topo, acesso às configurações e notificações agora têm ações funcionais. O aviso de notificações reflete mensagens realmente não lidas.
- Aulas sem matrícula e conteúdo não publicado têm verificações no servidor. Escritas de progresso validam a identidade e o acesso à aula.
- Matrícula reativada preserva o progresso. Desmarcar uma aula reabre um curso concluído e limpa a data de conclusão. O registro de visita usa upsert.
- Concluir o curso emite certificado de forma idempotente. Certificados já existentes ou revogados não são duplicados.
- Abrir diretamente a página de realização de uma prova não cria tentativa: é necessário acionar Começar prova.
- Reagendamento exclui a própria sessão da busca por conflitos. Administradores visualizam todas as aulas particulares; criação de aula valida professor, aluno e curso.
- O service worker não armazena páginas autenticadas no cache offline.
- Corrigidas grades em telas pequenas e tabelas administrativas/de alunos em tablets. Capas possuem estado de fallback se a imagem falhar.

## Evidências

- [Rotas](./rotas.json): páginas públicas, autenticação, redirecionamentos por perfil, cursos, aulas, provas e particulares com IDs reais, além de IDs inexistentes.
- [Fluxos](./fluxos.json): cadastro, erro de senha, login, callback, busca, matrícula, conclusão/desmarcação, certificado, cancelamento e retorno, prova, notificações, perfil e logout. A conta temporária e seus dados foram removidos.
- [Aluno e páginas públicas](./relatorio.json): 96 verificações nas larguras 320, 375, 414, 768, 1024 e 1440.
- [Administração](./admin/relatorio.json): 15 verificações.
- [Professor](./professor/relatorio.json): 6 verificações.
- [Detalhes de curso, aula e prova](./detalhes/relatorio.json): 6 verificações.

## Escopo e limitações do MVP

Pagamentos e assinaturas continuam simulados, conforme o escopo original; não há cobrança real integrada. Vídeos, reuniões e imagens externas dependem dos respectivos provedores. O desenho de QR dos certificados permanece decorativo, sem validação pública por leitura de QR. Não foi realizado deploy externo.

## Repetir a validação

Com o servidor ativo:

```bash
npm run lint
npm run typecheck
npm run audit:routes -- --browser
npm run audit:flows
npm run audit:responsive
```

Para reconstruir, pare antes o processo Next ativo e execute npm run build e npm run start.
