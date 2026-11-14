export type Question = {
  prompt: string;
  answer: string;
  options: readonly string[];
};

export type Lesson = {
  id: string;
  title: string;
  subtitle: string;
  xp: number;
  questions: readonly Question[];
};

export type LessonStatus = "done" | "current" | "locked";

export const lessons: readonly Lesson[] = [
  {
    id: "greetings",
    title: "Begrüßungen",
    subtitle: "Hallo sagen und sich vorstellen",
    xp: 35,
    questions: [
      {
        prompt: "Welche Begrüßung passt am Morgen?",
        answer: "Guten Morgen",
        options: ["Guten Morgen", "Gute Nacht", "Bis später", "Danke"],
      },
      {
        prompt: "Jemand geht schlafen. Was sagst du?",
        answer: "Gute Nacht",
        options: ["Guten Morgen", "Gute Nacht", "Guten Appetit", "Bitte schön"],
      },
      {
        prompt: "Wie antwortest du auf eine Begrüßung am Abend?",
        answer: "Guten Abend",
        options: ["Guten Abend", "Gute Reise", "Bis gestern", "Keine Ursache"],
      },
    ],
  },
  {
    id: "people",
    title: "Menschen & Namen",
    subtitle: "Über dich und andere sprechen",
    xp: 40,
    questions: [
      {
        prompt: "Wie stellst du dich vor?",
        answer: "Ich heiße Maya.",
        options: ["Ich bin heißen Maya.", "Ich heiße Maya.", "Maya ich Name.", "Heiße ich bin Maya."],
      },
      {
        prompt: "Wie fragst du nach dem Namen einer anderen Person?",
        answer: "Wie heißt du?",
        options: ["Wie heißt du?", "Wo wohnst du Nacht?", "Ich Name bist.", "Heißt wie ich?"],
      },
      {
        prompt: "Welche Antwort nennt ein Herkunftsland?",
        answer: "Ich komme aus Wien.",
        options: ["Ich komme aus Wien.", "Ich heiße aus Wien.", "Wien komme ich.", "Aus ich Wien bin."],
      },
    ],
  },
  {
    id: "cafe",
    title: "Im Café",
    subtitle: "Bestellen mit Selbstvertrauen",
    xp: 45,
    questions: [
      {
        prompt: "Wie bestellst du einen Kaffee?",
        answer: "Ich hätte gern einen Kaffee.",
        options: ["Ich hätte gern einen Kaffee.", "Ich bin ein Kaffee.", "Kaffee du holst.", "Gern hätte Kaffee ich bin."],
      },
      {
        prompt: "Wie sagst du, dass du bar bezahlen möchtest?",
        answer: "Ich möchte bar zahlen.",
        options: ["Ich möchte bar zahlen.", "Die Rechnung ist bar ich.", "Zahlen du bitte Kaffee.", "Bar ist möchte."],
      },
      {
        prompt: "Der Kaffee schmeckt. Was sagst du?",
        answer: "Der Kaffee ist lecker.",
        options: ["Der Kaffee ist lecker.", "Der Kaffee ist geschlossen.", "Lecker bin Kaffee.", "Kaffee schmeckt du."],
      },
    ],
  },
  {
    id: "review",
    title: "Wochenreview",
    subtitle: "Alles festigen",
    xp: 60,
    questions: [
      {
        prompt: "Wähle die passende Reaktion, wenn du jemanden neu triffst.",
        answer: "Freut mich, dich kennenzulernen.",
        options: ["Wie geht es dir?", "Freut mich, dich kennenzulernen.", "Bis morgen!", "Guten Appetit!"],
      },
      {
        prompt: "Wie verabschiedest du dich bis zum nächsten Tag?",
        answer: "Bis morgen!",
        options: ["Bis morgen!", "Guten Appetit!", "Ich heiße morgen.", "Keine Ahnung morgen."],
      },
      {
        prompt: "Was sagst du, bevor alle anfangen zu essen?",
        answer: "Guten Appetit!",
        options: ["Guten Appetit!", "Gute Nacht!", "Ich möchte gehen.", "Bis später, Kaffee."],
      },
    ],
  },
];

export function lessonById(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}

export function lessonStatuses(completedIds: readonly string[]): Record<string, LessonStatus> {
  const completed = new Set(completedIds);
  let foundCurrent = false;
  return Object.fromEntries(
    lessons.map((lesson) => {
      if (completed.has(lesson.id)) return [lesson.id, "done"];
      if (!foundCurrent) {
        foundCurrent = true;
        return [lesson.id, "current"];
      }
      return [lesson.id, "locked"];
    }),
  );
}

export function courseProgress(completedIds: readonly string[]): number {
  if (lessons.length === 0) return 0;
  const completed = lessons.filter((lesson) => completedIds.includes(lesson.id)).length;
  return Math.round((completed / lessons.length) * 100);
}
