# Finalização do projeto — 02/11/2026

## Resultado

| Verificação | Resultado |
|---|---|
| Build de produção | Aprovado |
| TypeScript | Sem erros |
| ESLint | Sem erros; um aviso preexistente em arquivo protegido pelo contrato técnico |
| Rotas com navegador e quatro perfis | 139/139 aprovadas |
| Fluxos completos com conta temporária | 21/21 aprovados |
| Layout responsivo | 96 páginas/tamanhos; zero achados |
| Bloqueio de login | 3/3 cenários aprovados |
| PWA | Manifesto, worker, ícones e fallback offline aprovados |

## Entregas concluídas

- Permissões por curso corrigidas em alunos, biblioteca, redações, aulas e provas.
- Respostas abertas aguardam correção humana, aceitam feedback individual e produzem resultado provisório até a correção.
- Provas têm autorização de matrícula, prazo no servidor, proteção contra tentativas concorrentes e rascunho local.
- Login bloqueia temporariamente a conta após cinco falhas e limita chamadas repetidas por origem.
- Recuperação de senha usa link assinado, expira em 30 minutos, invalida após uso e pode enviar pelo Resend.
- Pagamento real pode ser habilitado pelo Mercado Pago. O webhook validado ativa a assinatura somente após aprovação.
- Certificados possuem QR e consulta pública por código.
- Painel editorial gerencia cursos, módulos, aulas, materiais, provas, questões e publicação por professor responsável.
- Suporte interno possui protocolo, fila administrativa e resposta ao aluno.
- Termos, privacidade, validação de ambiente, backup de PostgreSQL e CI foram adicionados.

## Insumos para ativação comercial

O código está pronto para receber os serviços de produção. Ainda são necessários:

- credenciais comerciais do Mercado Pago e definição final dos benefícios dos planos;
- hospedagem, banco gerenciado e credenciais de produção;
- chave do Resend e remetente verificado;
- vídeos, PDFs, links de reunião e conteúdo pedagógico final;
- revisão jurídica dos textos e dados oficiais da empresa.

Até as credenciais serem fornecidas, mantenha `PAYMENT_PROVIDER=demo`. O seed é destrutivo e deve ser usado somente no banco de demonstração. O domínio foi deixado para a última etapa, conforme solicitado.

## Evidências

- `audit/rotas.json`: rotas públicas, autenticação, permissões e páginas dos quatro perfis.
- `audit/fluxos.json`: cadastro, login, matrícula, progresso, certificado, prova, notificações, perfil e logout.
- `audit/relatorio.json`: responsividade em 320, 375, 414, 768, 1024 e 1440 pixels.
- `npm run audit:pwa`: manifesto, service worker, ícones e navegação offline.
