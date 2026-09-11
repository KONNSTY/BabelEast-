import { create } from "zustand";
import { persist } from "zustand/middleware";
type LearningState = { xp: number; hearts: number; streak: number; lastLessonDate: string | null; answerQuestion: (correct: boolean) => void; finishLesson: (bonus: number) => void; };
export const useLearningStore = create<LearningState>()(persist((set) => ({ xp: 120, hearts: 5, streak: 4, lastLessonDate: null, answerQuestion: (correct) => set((state) => ({ xp: state.xp + (correct ? 10 : 2), hearts: correct ? state.hearts : Math.max(0, state.hearts - 1) })), finishLesson: (bonus) => set((state) => ({ xp: state.xp + bonus, streak: state.streak + (state.lastLessonDate ? 0 : 1), lastLessonDate: new Date().toISOString().slice(0, 10) })) }), { name: "linguaflow-learning", version: 1 }));
