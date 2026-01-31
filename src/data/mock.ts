export type Mode = "study" | "exercise" | "exam";

export type QA = {
  id: string;
  image?: string;
  question: string;
  answer: string;
  audio?: string; // url
  video?: string; // url
};

export type Topic = {
  id: string;
  name: string;
  items: QA[];
};

export type Module = {
  id: "codigo" | "sinais" | "mecanica" | "pecas";
  name: string;
  topics: Topic[];
};

export const MODULES: Module[] = [
  {
    id: "sinais",
    name: "Leitura de Sinais",
    topics: [
      {
        id: "perigo",
        name: "Sinais de Perigo",
        items: [
          {
            id: "curva-esquerda",
            image: "/mock/sinais/perigo-curva-esq.png",
            question: "Que sinal é este?",
            answer: "Sinal de perigo: Curva à esquerda",
            audio: "",
          },
          {
            id: "passadeira",
            image: "/mock/sinais/passadeira.png",
            question: "Identifique o sinal.",
            answer: "Passagem para peões",
          },
        ],
      },
      {
        id: "proibicao",
        name: "Sinais de Proibição",
        items: [
          {
            id: "sentido-proibido",
            image: "/mock/sinais/sentido-proibido.png",
            question: "Que significado tem este sinal?",
            answer: "Sentido proibido",
          },
        ],
      },
    ],
  },
  {
    id: "pecas",
    name: "Peças / Equipamentos",
    topics: [
      {
        id: "motor",
        name: "Conjunto do Motor",
        items: [
          {
            id: "alternador",
            image: "/mock/pecas/alternador.jpeg",
            question: "Nomeie o componente.",
            answer: "Alternador — gera energia elétrica para o sistema",
            video: "",
          },
          {
            id: "radiador",
            image: "/mock/pecas/radiador.jpeg",
            question: "Que peça é esta?",
            answer: "Radiador — arrefecimento do motor",
          },
        ],
      },
    ],
  },
  {
    id: "codigo",
    name: "Código e Regras",
    topics: [
      {
        id: "prioridades",
        name: "Prioridades",
        items: [
          {
            id: "rotunda",
            image: "/mock/codigo/rotunda.jpeg",
            question: "Numa rotunda, quem tem prioridade por regra geral?",
            answer:
              "Quem circula na rotunda (à esquerda) tem prioridade sobre quem pretende entrar.",
          },
        ],
      },
    ],
  },
  {
    id: "mecanica",
    name: "Mecânica (Teoria)",
    topics: [
      {
        id: "travagem",
        name: "Sistema de Travagem",
        items: [
          {
            id: "abs",
            image: "/mock/mecanica/abs.jpeg",
            question: "Para que serve o ABS?",
            answer:
              "Evita o bloqueio das rodas na travagem, ajudando a manter a dirigibilidade.",
          },
        ],
      },
    ],
  },
];
