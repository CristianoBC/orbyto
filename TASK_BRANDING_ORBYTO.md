Quero refatorar o front-end do projeto para aplicar a identidade visual oficial do sistema.

CONTEXTO
- O nome oficial do sistema agora é: Orbyto
- Subtítulo institucional: Plataforma de Gestão de Projetos e Ordens de Serviço
- Já existe um front-end em apps/web e um back-end em apps/api
- O logo oficial foi disponibilizado e deve ser usado no front-end
- O objetivo é evitar retrabalho futuro e já deixar o sistema com identidade visual consistente

ARQUIVO DO LOGO
- Considere que o logo estará salvo em:
  apps/web/public/orbyto-logo.png

OBJETIVOS
1. Substituir o nome atual do sistema por “Orbyto” em todo o front-end
2. Usar o logo oficial nas telas principais
3. Aplicar uma paleta visual inspirada no logo
4. Melhorar a apresentação visual das telas já existentes
5. Corrigir textos quebrados/estranhos e revisar acentuação
6. Manter um layout corporativo, moderno, limpo e profissional

PALETA VISUAL SUGERIDA
Use o logo como referência e crie variáveis/tokens de tema no front-end com algo próximo disso:
- background principal escuro: #111827
- superfície escura/sidebar: #0F172A
- roxo principal: #6D4CFF
- roxo secundário: #8B5CF6
- coral/laranja principal: #FF6B4A
- coral secundário: #FF7A59
- texto escuro: #0F172A
- texto suave: #64748B
- branco/superfície clara: #F8FAFC
- borda suave: #E5E7EB

Também pode usar um gradiente de marca para destaques:
linear-gradient(135deg, #6D4CFF 0%, #8B5CF6 45%, #FF6B4A 100%)

DIRETRIZES DE UI
- Sidebar escura, elegante, com o logo e o nome Orbyto no topo
- Subtítulo sob o nome: “Plataforma de Gestão de Projetos e Ordens de Serviço”
- Botões primários com cor/gradiente da marca
- Cards com visual mais refinado, bordas suaves e espaçamento melhor
- Tipografia mais consistente
- Melhorar cabeçalhos das páginas
- Melhorar badges/status sem exagero visual
- Preservar responsividade
- Manter o aspecto corporativo e profissional

TELAS A AJUSTAR
- Login
- Layout global
- Sidebar / navegação lateral
- Topbar / cabeçalho
- Dashboard
- Ordens de Serviço
- Projetos
- Tarefas
- Registros Diários
- Usuários

ALTERAÇÕES FUNCIONAIS/VISUAIS DESEJADAS
- Atualizar o título do navegador e metadata para Orbyto
- Atualizar o texto do sistema em layout, login e navegação
- Exibir o logo no login e na sidebar
- Criar um pequeno sistema de tokens/variáveis de tema para cores, bordas, radius, sombras e estados
- Uniformizar os botões “Nova ordem”, listas, cabeçalhos de seção e cards
- Revisar espaçamentos e hierarquia visual

CORREÇÃO DOS TEXTOS COM “?”
- Revisar todos os textos fixos do front-end e corrigir acentuação/encoding
- Verificar se há strings quebradas no código
- Identificar se há dados de exemplo com acentuação quebrada
- Se houver dados mockados/seedados com texto incorreto, corrigir também
- Onde o problema estiver vindo do banco, documentar claramente no final que os registros antigos precisarão ser recriados ou atualizados, porque o caractere “?” já foi persistido no dado

IMPORTANTE
- Não quebrar as funcionalidades existentes
- Não remover páginas existentes
- Manter a estrutura do projeto organizada
- Fazer alterações apenas no que for necessário para branding, refinamento visual e correções de texto
- Se precisar, criar ou ajustar componentes reutilizáveis para header, logo area, cards e botões

ARQUIVOS PROVÁVEIS A REVISAR
- apps/web/app/layout.tsx
- apps/web/app/globals.css
- apps/web/app/login/page.tsx
- componentes/layout/sidebar
- componentes de header/topbar
- páginas de service-orders, projects, tasks, daily-logs e users
- qualquer arquivo de tema/estilo compartilhado

ENTREGA ESPERADA
Ao final:
1. me informe quais arquivos foram alterados
2. resuma as mudanças visuais realizadas
3. diga se encontrou textos quebrados por encoding
4. diga se há registros no banco com “?” que precisarão ser corrigidos manualmente
5. rode typecheck e build do apps/web, se possível