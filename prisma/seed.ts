import { PrismaClient, Role, LessonKind, SessionStatus, PaymentStatus, PaymentMethod, PlanInterval, SubscriptionStatus, QuestionType, EnrollmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "senha123";

function slugify(v: string) {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("🌱 Semeando Scott English Academy...");

  await prisma.notification.deleteMany();
  await prisma.examAnswer.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.review.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.lessonMaterial.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.scheduledSession.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash(PASSWORD, 10);

  // ---------- Usuários ----------
  const masterHash = await bcrypt.hash("123Scott#", 10);
  await prisma.user.create({
    data: {
      name: "Scott English Academy",
      email: "englishacademyscott@gmail.com",
      passwordHash: masterHash,
      role: Role.ADMIN,
      bio: "Administrador Master da Scott English Academy.",
      phone: "+55 11 90000-0000",
      avatarUrl: null,
    },
  });

  const scott = await prisma.user.create({
    data: {
      name: "Scott Anderson",
      email: "scott@scottenglish.com.br",
      passwordHash: hash,
      role: Role.ADMIN,
      bio: "Professor de inglês e fundador da Scott English Academy. 12 anos ensinando conversação.",
      phone: "+55 11 90000-0001",
      avatarUrl: null,
    },
  });

  const marina = await prisma.user.create({
    data: {
      name: "Marina Costa",
      email: "marina@scottenglish.com.br",
      passwordHash: hash,
      role: Role.PROFESSOR,
      bio: "Professora de inglês com foco em business english e IELTS.",
    },
  });

  const rafael = await prisma.user.create({
    data: {
      name: "Rafael Nunes",
      email: "rafael@scottenglish.com.br",
      passwordHash: hash,
      role: Role.PROFESSOR,
      bio: "Professor de conversação e phonetic trainer. Apaixonado por pronúncia e ritmo.",
    },
  });

  const _julia = await prisma.user.create({
    data: {
      name: "Júlia Ferreira",
      email: "julia@scottenglish.com.br",
      passwordHash: hash,
      role: Role.EDITOR,
      bio: "Editora de conteúdo. Cria aulas, exercícios e materiais de apoio.",
    },
  });

  const alunos = [] as { id: string; name: string; email: string }[];
  const nomes = [
    "Ana Beatriz Lima",
    "Carlos Eduardo Souza",
    "Fernanda Rodrigues",
    "Gustavo Almeida",
    "Helena Martins",
    "Igor Pereira",
    "Joana Carvalho",
    "Lucas Teixeira",
  ];
  for (const nome of nomes) {
    const u = await prisma.user.create({
      data: {
        name: nome,
        email: `${slugify(nome)}@email.com`,
        passwordHash: hash,
        role: Role.ALUNO,
        bio: "Aluno na Scott English Academy.",
      },
    });
    alunos.push({ id: u.id, name: u.name, email: u.email });
  }

  console.log(`   ✓ ${alunos.length + 4} usuários`);

  // ---------- Planos ----------
  const planoStarter = await prisma.plan.create({
    data: {
      name: "Starter",
      slug: "starter",
      description: "Para quem está começando do zero e quer criar o hábito de falar.",
      priceCents: 7900,
      interval: PlanInterval.MENSAL,
      features: ["Aulas gravadas do nível básico", "1 prova por módulo", "Acesso ao app", "Certificado de conclusão"],
      position: 1,
    },
  });

  const planoPro = await prisma.plan.create({
    data: {
      name: "Pro",
      slug: "pro",
      description: "O caminho completo: do básico à fluência, com aulas ao vivo semanais.",
      priceCents: 14900,
      interval: PlanInterval.MENSAL,
      features: [
        "Todos os cursos e aulas gravadas",
        "Aula ao vivo semanal com professor",
        "Provas com certificado a cada módulo",
        "Correção personalizada de redação",
        "Acesso ao material exclusivo",
      ],
      highlight: true,
      position: 2,
    },
  });

  const _planoFluente = await prisma.plan.create({
    data: {
      name: "Fluente",
      slug: "fluente",
      description: "Intensivo com aulas particulares semanais e acompanhamento dedicado.",
      priceCents: 39900,
      interval: PlanInterval.MENSAL,
      features: [
        "Tudo do plano Pro",
        "2 aulas particulares por mês",
        "Plano de estudo personalizado",
        "Revisão de pronúncia 1:1",
        "Mentoria mensal",
      ],
      position: 3,
    },
  });

  await prisma.plan.create({
    data: {
      name: "Pro Anual",
      slug: "pro-anual",
      description: "Acesso Pro por 12 meses, com valor anual apresentado antes da contratação.",
      priceCents: 149000,
      interval: PlanInterval.ANUAL,
      features: ["Tudo do plano Pro", "2 meses de cortesia", "Preço travido"],
      position: 4,
    },
  });

  console.log("   ✓ 4 planos");

  // ---------- Cursos ----------
  const cursoBasico = await prisma.course.create({
    data: {
      slug: "ingles-basico-do-zero",
      title: "Inglês do Zero",
      subtitle: "Comece a falar em 30 dias",
      description:
        "O ponto de partida ideal para quem nunca estudou inglês ou trava no básico. Você aprende o essencial do dia a dia com método direto, muita prática de fala e correção gentil. Ao final do módulo, você se apresenta, faz pedidos, pede direções e participa de uma conversa simples com segurança.",
      coverUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80",
      category: "Inglês Básico",
      level: "INICIANTE",
      published: true,
      priceCents: 0,
      durationMin: 420,
      teacherId: scott.id,
    },
  });

  const cursoConversacao = await prisma.course.create({
    data: {
      slug: "conversacao-intermediario",
      title: "Conversação Intermediária",
      subtitle: "Doze countrys ao mundo real",
      description:
        "Para quem já entende um pouco mas trava na hora de falar. Trabalhamos vocabulário de alta frequência, estruturas que funcionam em qualquer contexto e o hábito de pensar em inglês. A cada aula você sai com 5 frases novas já no contexto certo.",
      coverUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80",
      category: "Conversação",
      level: "INTERMEDIARIO",
      published: true,
      priceCents: 9900,
      durationMin: 540,
      teacherId: marina.id,
    },
  });

  const cursoBusiness = await prisma.course.create({
    data: {
      slug: "business-english",
      title: "Business English",
      subtitle: "Reuniões, e-mails e apresentações",
      description:
        "Inglês corporativo na prática: como conduzir uma reunião, estruturar um pitch, escrever e-mails que geram resposta e participar de entrevistas com confiança.",
      coverUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80",
      category: "Corporativo",
      level: "AVANCADO",
      published: true,
      priceCents: 19900,
      durationMin: 480,
      teacherId: rafael.id,
    },
  });

  const cursoPronuncia = await prisma.course.create({
    data: {
      slug: "pronunciacao-e-fluencia",
      title: "Pronúncia & Fluência",
      subtitle: "Fale como um fluente",
      description:
        "O curso que transforma o seu inglês. Trabalhamos os sons que os brasileiros mais erram, ritmo, entonação e fluência artificial.",
      coverUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=80",
      category: "Pronúncia",
      level: "AVANCADO",
      published: true,
      priceCents: 14900,
      durationMin: 600,
      teacherId: rafael.id,
    },
  });

  await prisma.course.create({
    data: {
      slug: "preparacao-ielts",
      title: "Preparação IELTS",
      subtitle: "Preparação estruturada para avançar no IELTS",
      description: "Preparação intensiva para o IELTS com foco nas quatro habilidades, escrita task 1 e 2, e simulados semanais.",
      coverUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80",
      category: "Certificação",
      level: "AVANCADO",
      published: false,
      priceCents: 34900,
      durationMin: 720,
      teacherId: marina.id,
    },
  });

  console.log("   ✓ 5 cursos");

  // ---------- Módulos e aulas ----------
  const estrutura: {
    cursoId: string;
    modulos: { title: string; summary: string; aulas: { title: string; desc: string; video: string; dur: number; free?: boolean }[] }[];
  }[] = [
    {
      cursoId: cursoBasico.id,
      modulos: [
        {
          title: "Módulo 1 — Cumprimentos e apresentação",
          summary: "O toolkit para se apresentar em qualquer lugar.",
          aulas: [
            { title: "Aula 1: Hello! Seu primeiro contato", desc: "Alphabet, sons básicos, como falar 'Hello' de um jeito natural.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 780, free: true },
            { title: "Aula 2: Meu nome é...", desc: "Apresentação pessoal: nome, idade, origem, profissão.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 900 },
            { title: "Aula 3: Nice to meet you", desc: "Encontros, apresentações mútuas e small talk para breaking the ice.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 960 },
            { title: "Aula 4: Numbers 1–100", desc: "Números, preços, telefones, horários.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1020 },
          ],
        },
        {
          title: "Módulo 2 — Rotina e vida diária",
          summary: "Descreva seu dia em inglês com naturalidade.",
          aulas: [
            { title: "Aula 5: My daily routine", desc: "Verbos regulares no presente + routine verbs.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1080 },
            { title: "Aula 6: I like / I don't like", desc: "Falar de gostos, comidas, hobbies e Opinion.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 990 },
            { title: "Aula 7: Time and days", desc: "Dias da semana, horários,appointments.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1020 },
            { title: "Aula 8: Shopping", desc: "Preços, tamanhos, negociação, polite requests.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1140 },
          ],
        },
        {
          title: "Módulo 3 — No mundo real",
          summary: "Situações que você vive de verdade.",
          aulas: [
            { title: "Aula 9: At the restaurant", desc: "Pedir, reclamar, dividir a conta.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1200 },
            { title: "Aula 10: Directions", desc: "Pedir e dar direções, entender mapas.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1080 },
            { title: "Aula 11: On the phone", desc: "Atender, transferir, confirmar horários.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1140 },
            { title: "Aula 12: Checkpoint final do básico", desc: "Simulado de fala com avaliação de desempenho.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1500 },
          ],
        },
      ],
    },
    {
      cursoId: cursoConversacao.id,
      modulos: [
        {
          title: "Módulo 1 — Falar sem travar",
          summary: "Frases prontas para qualquer conversa.",
          aulas: [
            { title: "Aula 1: The 20 phrases that unblock you", desc: "Frases-curinga que resolvem 80% das situações.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1320 },
            { title: "Aula 2: Ask better questions", desc: "Como puxar conversa e manter o outro falando.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1260 },
            { title: "Aula 3: Tell your story", desc: "Estrutura de narrativa: setup, conflito, resolução.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1380 },
            { title: "Aula 4: Idioms you actually hear", desc: "Idiomas reais de TV e do escritório.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1440 },
          ],
        },
        {
          title: "Módulo 2 — dominating the conversation",
          summary: "Argumentos, discordância e fluency.",
          aulas: [
            { title: "Aula 5: Agree, disagree, compromise", desc: "Escalas de concordância e discordância.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1380 },
            { title: "Aula 6: Past experiences", desc: " storytelling no passado + irregular verbs.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1320 },
            { title: "Aula 7: Plans and hypotheticals", desc: "If I were, I'd, going to, will.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1440 },
            { title: "Aula 8: Natural connectors", desc: "However, although, besides — a arte da solda.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1260 },
          ],
        },
      ],
    },
    {
      cursoId: cursoBusiness.id,
      modulos: [
        {
          title: "Módulo 1 — Comunicações corporativas",
          summary: "O tom certo para cada canal.",
          aulas: [
            { title: "Aula 1: E-mails que geram resposta", desc: "Assunto, estrutura, CTA e tom.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1440 },
            { title: "Aula 2: Run a meeting", desc: "Agenda, mediação, resume, action items.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1500 },
            { title: "Aula 3: Presenting with impact", desc: "Estrutura de pitch e delivery.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1560 },
            { title: "Aula 4: Small talk at work", desc: "Conversa de corredor, sem gaguejar.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1080 },
          ],
        },
        {
          title: "Módulo 2 — Negociação e influência",
          summary: "Fechar mais e melhor.",
          aulas: [
            { title: "Aula 5: Negotiating with confidence", desc: "BATNA, concessões, linguagem de valor.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1620 },
            { title: "Aula 6: Data storytelling", desc: "Narrar números para manager.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1500 },
            { title: "Aula 7: Interviews & networking", desc: "Pitch pessoal e follow-up.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1440 },
            { title: "Aula 8: Managing teams in English", desc: "Feedback, delegation e 1:1.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1560 },
          ],
        },
      ],
    },
    {
      cursoId: cursoPronuncia.id,
      modulos: [
        {
          title: "Módulo 1 — Sons do inglês",
          summary: "Os sons que travam o brasileiro.",
          aulas: [
            { title: "Aula 1: /θ/ e /ð/", desc: "think vs sink — o som que ninguém acerta.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1500 },
            { title: "Aula 2: /ɪ/ vs /iː/", desc: "ship vs sheep.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1440 },
            { title: "Aula 3: /r/ e o som do R", desc: "O r americano, maduro e lite.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1380 },
            { title: "Aula 4: Linking e consoantes", desc: "Consoantes emBlend e final de palavra.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1560 },
          ],
        },
        {
          title: "Módulo 2 — Fluência e ritmo",
          summary: "Soar natural, não decorado.",
          aulas: [
            { title: "Aula 5: Intonation", desc: "Subir e descer a entonação como o falante nativo.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1440 },
            { title: "Aula 6: Reduce your speed", desc: "Falar rápido sem perder clareza.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1380 },
            { title: "Aula 7: Shadowing practice", desc: "O método de repetição guiada.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1620 },
            { title: "Aula 8: Final fluency assessment", desc: "Gravação + feedback do professor.", video: "https://www.youtube.com/embed/dQw4w9WgXcQ", dur: 1800 },
          ],
        },
      ],
    },
  ];

  const todasAulas: { id: string; courseId: string; title: string }[] = [];

  for (const c of estrutura) {
    for (let mi = 0; mi < c.modulos.length; mi++) {
      const mod = c.modulos[mi];
      const modulo = await prisma.module.create({
        data: { title: mod.title, summary: mod.summary, position: mi + 1, courseId: c.cursoId },
      });
      for (let ai = 0; ai < mod.aulas.length; ai++) {
        const a = mod.aulas[ai];
        const aula = await prisma.lesson.create({
          data: {
            title: a.title,
            description: a.desc,
            kind: LessonKind.AULA_GRAVADA,
            videoUrl: a.video,
            provider: "embed",
            durationSec: a.dur,
            position: ai + 1,
            free: a.free ?? false,
            published: true,
            moduleId: modulo.id,
          },
        });
        todasAulas.push({ id: aula.id, courseId: c.cursoId, title: aula.title });
        if (ai === 0) {
          await prisma.lessonMaterial.createMany({
            data: [
              { title: "Material da aula (PDF)", url: "https://exemplo.com/aula-1.pdf", kind: "PDF", lessonId: aula.id },
              { title: "Ficha de exercícios", url: "https://exemplo.com/exercicios-1.pdf", kind: "PDF", lessonId: aula.id },
            ],
          });
        }
      }
    }
  }

  console.log(`   ✓ ${todasAulas.length} aulas gravadas`);

  // ---------- Provas ----------
  async function criarProva(
    titulo: string,
    descricao: string,
    courseId: string,
    moduleId: string | null,
    perguntas: { tipo: QuestionType; enunciado: string; opcoes?: string[]; correta?: number; pontos?: number }[]
  ) {
    const prova = await prisma.exam.create({
      data: {
        title: titulo,
        description: descricao,
        timeLimitMin: 20,
        passingPercent: 60,
        maxAttempts: 3,
        published: true,
        courseId,
        moduleId,
      },
    });
    for (let i = 0; i < perguntas.length; i++) {
      const p = perguntas[i];
      const q = await prisma.question.create({
        data: {
          type: p.tipo,
          prompt: p.enunciado,
          points: p.pontos ?? 1,
          position: i + 1,
          examId: prova.id,
        },
      });
      if (p.opcoes) {
        for (let j = 0; j < p.opcoes.length; j++) {
          await prisma.option.create({
            data: { text: p.opcoes[j], isCorrect: j === p.correta, position: j + 1, questionId: q.id },
          });
        }
      }
    }
    return prova;
  }

  const modulosBasico = await prisma.module.findMany({ where: { courseId: cursoBasico.id }, orderBy: { position: "asc" } });
  const modulosConversa = await prisma.module.findMany({ where: { courseId: cursoConversacao.id }, orderBy: { position: "asc" } });

  await criarProva(
    "Prova — Módulo 1: Apresentações",
    "Verifique se você domina as apresentações pessoais e o vocabulário de números.",
    cursoBasico.id,
    modulosBasico[0]?.id ?? null,
    [
      { tipo: QuestionType.MULTIPLA_ESCOLHA, enunciado: "Qual é a forma correta de dizer 'Meu nome é João'?", opcoes: ["My name is John", "I name is John", "Me name John", "My is name John"], correta: 0 },
      { tipo: QuestionType.MULTIPLA_ESCOLHA, enunciado: "Como você pergunta 'Qual é a sua idade?'", opcoes: ["How old you are?", "What is your age?", "How old are you?", "You are how old?"], correta: 2 },
      { tipo: QuestionType.VERDADEIRO_FALSO, enunciado: "A resposta natural para 'Nice to meet you' é 'Nice to meet you too'.", opcoes: ["Verdadeiro", "Falso"], correta: 0 },
      { tipo: QuestionType.MULTIPLA_ESCOLHA, enunciado: "Qual número é 47?", opcoes: ["Forty-seven", "Fourty-seven", "Four-seven", "Seventy-four"], correta: 0 },
      { tipo: QuestionType.TEXTO_LIVRE, enunciado: "Escreva, em inglês, 2 frases se apresentando (nome + o que você faz).", pontos: 5 },
    ]
  );

  await criarProva(
    "Prova — Módulo 2: Rotina e gostos",
    "Teste verbos no presente, rotina e gostos com 'like'.",
    cursoBasico.id,
    modulosBasico[1]?.id ?? null,
    [
      { tipo: QuestionType.MULTIPLA_ESCOLHA, enunciado: "Qual frase está correta?", opcoes: ["I goes to work by bus", "I go to work by bus", "I going to work by bus", "I am go to work by bus"], correta: 1 },
      { tipo: QuestionType.MULTIPLA_ESCOLHA, enunciado: "Complete: 'She ___ coffee in the morning.'", opcoes: ["drink", "drinks", "drinking", "is drink"], correta: 1 },
      { tipo: QuestionType.VERDADEIRO_FALSO, enunciado: "'I don't like fish' significa 'Eu não gosto de peixe.'", opcoes: ["Verdadeiro", "Falso"], correta: 0 },
      { tipo: QuestionType.MULTIPLA_ESCOLHA, enunciado: "Qual é o plural de 'day'?", opcoes: ["days", "dayes", "day", "daies"], correta: 0 },
      { tipo: QuestionType.MULTIPLA_ESCOLHA, enunciado: "Como você diz 'Eu gosto de música'?", opcoes: ["I like music", "I likes music", "I am like music", "I liking music"], correta: 0 },
    ]
  );

  await criarProva(
    "Prova — Conversação: Unlock your speech",
    "Frases de emergência e conectores que travam a conversa.",
    cursoConversacao.id,
    modulosConversa[0]?.id ?? null,
    [
      { tipo: QuestionType.MULTIPLA_ESCOLHA, enunciado: "Qual expressão serve para ganhar tempo enquanto pensa?", opcoes: ["That's a good point", "Well, let me think for a second", "Never mind", "I don't know"], correta: 1 },
      { tipo: QuestionType.MULTIPLA_ESCOLHA, enunciado: "Como você diz 'Faz tempo que não te vejo'?", opcoes: ["Long time no see", "Long time don't see you", "Long time not see", "Time long no see"], correta: 0 },
      { tipo: QuestionType.VERDADEIRO_FALSO, enunciado: "'I see' pode ser usado para mostrar que você entendeu.", opcoes: ["Verdadeiro", "Falso"], correta: 0 },
      { tipo: QuestionType.MULTIPLA_ESCOLHA, enunciado: "Qual conector introduz uma ideia contrária?", opcoes: ["Because", "However", "Also", "So"], correta: 1 },
      { tipo: QuestionType.TEXTO_LIVRE, enunciado: "Escreva 5 frases que você usaria para manter uma conversa em inglês.", pontos: 5 },
    ]
  );

  console.log("   ✓ 3 provas");

  // ---------- Sessões agendadas ----------
  const agora = new Date();
  const em = (dias: number, hora: number) => {
    const d = new Date(agora);
    d.setDate(d.getDate() + dias);
    d.setHours(hora, 0, 0, 0);
    return d;
  };

  const sessoes = [
    { title: "Live — Conversação: tema 'Weekend plans'", desc: "Conversação livre em roda, com correção em tempo real.", t: scott.id, s: alunos[0].id, c: cursoConversacao.id, dias: 1, hora: 19 },
    { title: "Live — Pronúncia: workshop de /θ/ e /ð/", desc: "Sessão prática focada nos sons mais difíceis.", t: rafael.id, s: alunos[1].id, c: cursoPronuncia.id, dias: 2, hora: 20 },
    { title: "Live — Business English: simulação de reunião", desc: "Simulação de reunião de orçamento em inglês.", t: marina.id, s: alunos[2].id, c: cursoBusiness.id, dias: 3, hora: 18 },
    { title: "Aula particular — Ana Beatriz", desc: "Revisão do módulo 1 e prática de pronúncia.", t: scott.id, s: alunos[0].id, c: null, dias: 4, hora: 17 },
    { title: "Aula particular — Carlos Eduardo", desc: "Preparação para entrevista em inglês.", t: marina.id, s: alunos[1].id, c: cursoBusiness.id, dias: 5, hora: 15 },
    { title: "Live — Exam tips: IELTS writing", desc: "Estratégia para task 1 e task 2.", t: marina.id, s: alunos[3].id, c: null, dias: 7, hora: 19 },
    { title: "Live — Conversação aberta", desc: "Sessão aberta para todos os assinantes Pro.", t: scott.id, s: null, c: cursoConversacao.id, dias: 9, hora: 20 },
    { title: "Live — Grammar in context", desc: "Gramática aplicada, do básico ao intermediário.", t: rafael.id, s: alunos[4].id, c: cursoConversacao.id, dias: -2, hora: 19 },
  ];

  for (const s of sessoes) {
    const start = em(s.dias, s.hora);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    await prisma.scheduledSession.create({
      data: {
        title: s.title,
        description: s.desc,
        kind: s.c === null && s.title.includes("particular") ? LessonKind.AULA_PARTICULAR : LessonKind.AULA_AO_VIVO,
        status: s.dias < 0 ? SessionStatus.CONCLUIDA : SessionStatus.AGENDADA,
        startsAt: start,
        endsAt: end,
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        meetingCode: "SEA-" + Math.floor(Math.random() * 900 + 100),
        recordedUrl: s.dias < 0 ? "https://www.youtube.com/embed/dQw4w9WgXcQ" : null,
        teacherId: s.t,
        studentId: s.s,
        courseId: s.c,
        createdById: s.t,
      },
    });
  }

  console.log("   ✓ 8 sessões agendadas");

  // ---------- Matrículas, progresso, pagamentos ----------
  for (const a of alunos) {
    await prisma.enrollment.create({
      data: {
        studentId: a.id,
        courseId: [cursoBasico.id, cursoConversacao.id][Math.floor(Math.random() * 2)],
        status: EnrollmentStatus.ATIVO,
        progress: Math.floor(Math.random() * 70) + 15,
      },
    });
  }

  await prisma.enrollment.updateMany({
    where: { studentId: alunos[0].id, courseId: cursoConversacao.id },
    data: { progress: 78 },
  });

  // progresso de aulas
  for (let i = 0; i < 14; i++) {
    const a = alunos[i % alunos.length];
    const aula = todasAulas[i % todasAulas.length];
    const pct = i % 3 === 0 ? 100 : 30 + Math.floor(Math.random() * 60);
    await prisma.lessonProgress.create({
      data: {
        studentId: a.id,
        lessonId: aula.id,
        watchedPercent: pct,
        completed: pct === 100,
        completedAt: pct === 100 ? new Date() : null,
      },
    });
  }

  // assinatura + pagamentos
  const assinantes = [alunos[0], alunos[1], alunos[2], alunos[3], alunos[4]];
  for (let i = 0; i < assinantes.length; i++) {
    const plano = i < 3 ? planoPro : planoStarter;
    await prisma.subscription.create({
      data: {
        userId: assinantes[i].id,
        planId: plano.id,
        status: SubscriptionStatus.ATIVA,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.payment.create({
      data: {
        studentId: assinantes[i].id,
        amountCents: plano.priceCents,
        status: PaymentStatus.PAGO,
        method: i % 2 === 0 ? PaymentMethod.PIX : PaymentMethod.CARTAO,
        reference: `SEA-${Date.now()}-${i}`,
        description: `Assinatura ${plano.name} — Scott English Academy`,
        paidAt: new Date(Date.now() - (i + 1) * 30 * 24 * 60 * 60 * 1000),
        dueAt: new Date(Date.now() - (i + 1) * 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // pagamentos pendentes / outros
  await prisma.payment.create({
    data: {
      studentId: alunos[5].id,
      amountCents: 14900,
      status: PaymentStatus.PENDENTE,
      method: PaymentMethod.BOLETO,
      reference: `SEA-${Date.now()}-pend`,
      description: "Renovação Pro — vencimento em 3 dias",
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.payment.create({
    data: {
      studentId: alunos[6].id,
      amountCents: 14900,
      status: PaymentStatus.PAGO,
      method: PaymentMethod.CARTAO,
      reference: `SEA-${Date.now()}-business`,
      description: "Curso Business English",
      courseId: cursoBusiness.id,
      paidAt: new Date(),
      dueAt: new Date(),
    },
  });

  // certificado
  await prisma.certificate.create({
    data: {
      code: "SEA-CERT-2026-0001",
      studentId: alunos[0].id,
      courseId: cursoBasico.id,
      issuedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
  });

  // reviews
  await prisma.review.createMany({
    data: [
      { studentId: alunos[0].id, courseId: cursoBasico.id, rating: 5, comment: "Melhor curso de inglês que fiz. Finally consigo falar!" },
      { studentId: alunos[1].id, courseId: cursoBasico.id, rating: 5, comment: "Método direto, sem enrolação. Recomendo demais." },
      { studentId: alunos[2].id, courseId: cursoConversacao.id, rating: 4, comment: "As aulas ao vivo salvaram minha confiança." },
      { studentId: alunos[3].id, courseId: cursoConversacao.id, rating: 5, comment: "O Scott é um professor incrível." },
    ],
  });

  // notificações
  await prisma.notification.createMany({
    data: [
      { userId: alunos[0].id, title: "Nova aula agendada", body: "Live de Conversação amanhã às 19:00.", href: "/app/agenda" },
      { userId: alunos[0].id, title: "Prova disponível", body: "A prova do Módulo 2 já está liberada.", href: "/app/provas" },
      { userId: alunos[0].id, title: "Certificado emitido", body: "Parabéns! Seu certificado do Módulo 1 está pronto.", href: "/app/certificados" },
      { userId: scott.id, title: "Nova matrícula", body: "Ana Beatriz Lima se matriculou em Conversação Intermediária.", href: "/app/alunos" },
      { userId: marina.id, title: "Aula particular hoje", body: "Carlos Eduardo às 15:00.", href: "/app/agenda" },
    ],
  });

  console.log("   ✓ matrículas, progresso, pagamentos e notificações");

  console.log("\n✅ Seed concluído!");
  console.log("\n   Logins (senha: senha123):");
  console.log("   Admin/Professor: scott@scottenglish.com.br");
  console.log("   Professor:       marina@scottenglish.com.br");
  console.log("   Editor:          julia@scottenglish.com.br");
  console.log("   Aluno:           anabeatrizlima@email.com\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
