import type { Mood } from "@/lib/mood";

export type Quote = { q: string; by: string };

// What the mascot "says": short lines from philosophers and thinkers, picked to fit each mood.
const QUOTES: Record<Mood, Quote[]> = {
  idle: [
    { q: "Solo sé que no sé nada.", by: "Sócrates" },
    { q: "El comienzo es la parte más importante del trabajo.", by: "Platón" },
  ],
  curious: [
    { q: "Fue el asombro lo que llevó a los hombres a filosofar.", by: "Aristóteles" },
    { q: "Conócete a ti mismo.", by: "Templo de Delfos" },
  ],
  thinking: [
    { q: "Pienso, luego existo.", by: "René Descartes" },
    { q: "Una vida sin examen no merece ser vivida.", by: "Sócrates" },
  ],
  sleepy: [
    { q: "Los despiertos tienen un mundo común; los que duermen se vuelven cada uno al suyo.", by: "Heráclito" },
    { q: "Cuando te cueste levantarte, piensa: me levanto para hacer el trabajo de un ser humano.", by: "Marco Aurelio" },
  ],
  happy: [
    { q: "Somos lo que hacemos repetidamente. La excelencia es un hábito.", by: "Will Durant" },
    { q: "La felicidad depende de nosotros mismos.", by: "Aristóteles" },
  ],
  excited: [
    { q: "La fortuna favorece a los audaces.", by: "Virgilio" },
    { q: "Todos los hombres desean por naturaleza saber.", by: "Aristóteles" },
  ],
  onFire: [
    { q: "No importa lo lento que vayas, siempre que no te detengas.", by: "Confucio" },
    { q: "Quien tiene un porqué para vivir puede soportar casi cualquier cómo.", by: "Friedrich Nietzsche" },
  ],
  comeback: [
    { q: "Lo que no me mata me hace más fuerte.", by: "Friedrich Nietzsche" },
    { q: "Lo que se interpone en el camino se convierte en el camino.", by: "Marco Aurelio" },
  ],
  confident: [
    { q: "El hombre es la medida de todas las cosas.", by: "Protágoras" },
    { q: "Saber es poder.", by: "Francis Bacon" },
  ],
  oops: [
    { q: "Errar es humano.", by: "Séneca" },
    { q: "Cometer un error y no corregirlo es cometer otro error.", by: "Confucio" },
  ],
  sad: [
    { q: "Las dificultades fortalecen la mente, como el trabajo fortalece el cuerpo.", by: "Séneca" },
    { q: "Lo que se interpone en el camino se convierte en el camino.", by: "Marco Aurelio" },
  ],
  shocked: [
    { q: "Nadie se baña dos veces en el mismo río.", by: "Heráclito" },
    { q: "Nada es permanente, excepto el cambio.", by: "Heráclito" },
  ],
  crying: [
    { q: "En medio del invierno descubrí que había en mí un verano invencible.", by: "Albert Camus" },
    { q: "Sufrimos más en la imaginación que en la realidad.", by: "Séneca" },
  ],
  nervous: [
    { q: "Lo que perturba a los hombres no son las cosas, sino las opiniones sobre ellas.", by: "Epicteto" },
    { q: "Hay cosas que dependen de nosotros y cosas que no.", by: "Epicteto" },
  ],
  determined: [
    { q: "Un viaje de mil millas comienza con un solo paso.", by: "Lao Tse" },
    { q: "Quien domina a otros es fuerte; quien se domina a sí mismo es poderoso.", by: "Lao Tse" },
  ],
  celebrating: [
    { q: "Todo lo excelso es tan difícil como raro.", by: "Baruch Spinoza" },
    { q: "La excelencia no es un acto, sino un hábito.", by: "Will Durant" },
  ],
  proud: [
    { q: "Todos los hombres desean por naturaleza saber.", by: "Aristóteles" },
    { q: "Saber es poder.", by: "Francis Bacon" },
  ],
  relieved: [
    { q: "Mientras dura la vida, hay que seguir aprendiendo a vivir.", by: "Séneca" },
    { q: "Quien no se contenta con poco, con nada se contenta.", by: "Epicuro" },
  ],
  heartbroken: [
    { q: "La vida solo puede comprenderse mirando hacia atrás, pero debe vivirse mirando hacia adelante.", by: "Søren Kierkegaard" },
    { q: "En medio del invierno descubrí que había en mí un verano invencible.", by: "Albert Camus" },
  ],
};

export const mascotQuote = (mood: Mood, pulse: number): Quote => QUOTES[mood][(pulse + mood.length) % QUOTES[mood].length];
