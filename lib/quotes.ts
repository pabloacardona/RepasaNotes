export type Fact = { q: string; by: string };

// What the mascot "says": curious facts worth remembering, from science, history, technology and how learning works.
// `by` is the topic shown under the text.
export const FACTS: Fact[] = [
  { q: "Los pulpos tienen tres corazones y sangre azul: dos bombean la sangre a las branquias y el tercero al resto del cuerpo.", by: "Biología" },
  { q: "Un día en Venus dura más que su año: tarda unos 243 días terrestres en girar sobre sí mismo y solo 225 en dar la vuelta al Sol.", by: "Astronomía" },
  { q: "Cleopatra vivió más cerca en el tiempo del primer iPhone que de la construcción de la Gran Pirámide de Guiza.", by: "Historia" },
  { q: "Tu cerebro pesa apenas el 2% de tu cuerpo, pero consume cerca del 20% de toda tu energía.", by: "Cuerpo humano" },
  { q: "La Torre Eiffel crece hasta 15 centímetros en verano: el calor dilata el hierro.", by: "Física" },
  { q: "Los tiburones son más antiguos que los árboles: ya nadaban hace más de 400 millones de años.", by: "Biología" },
  { q: "La luz del Sol tarda unos 8 minutos y 20 segundos en llegar a la Tierra. Lo que ves del Sol es su pasado.", by: "Astronomía" },
  { q: "Una cucharadita de material de una estrella de neutrones pesaría unos mil millones de toneladas.", by: "Astronomía" },
  { q: "El primer 'bug' informático documentado fue una polilla atrapada en un relé del Harvard Mark II, en 1947.", by: "Tecnología" },
  { q: "Ada Lovelace escribió en 1843 el primer algoritmo pensado para una máquina, un siglo antes de que existieran los ordenadores modernos.", by: "Tecnología" },
  { q: "La palabra 'robot' viene del checo 'robota', que significa trabajo forzado, y apareció por primera vez en una obra de teatro de 1920.", by: "Lenguaje" },
  { q: "Python se llama así por el grupo de humor Monty Python, no por la serpiente.", by: "Tecnología" },
  { q: "Google se llamó BackRub en sus inicios.", by: "Tecnología" },
  { q: "El primer sitio web de la historia, publicado por Tim Berners-Lee en el CERN en 1991, sigue en línea.", by: "Tecnología" },
  { q: "El ordenador de guía del Apolo 11 tenía unos 4 KB de memoria RAM: millones de veces menos que un teléfono actual.", by: "Tecnología" },
  { q: "Un rayo calienta el aire a unos 30.000 °C, unas cinco veces la temperatura de la superficie del Sol.", by: "Física" },
  { q: "El sonido viaja unas cuatro veces más rápido en el agua que en el aire.", by: "Física" },
  { q: "Según la relatividad, el tiempo pasa más despacio cerca de una gran masa. Los relojes de los satélites GPS se corrigen por eso.", by: "Física" },
  { q: "El agua caliente a veces se congela antes que la fría. Se llama efecto Mpemba y aún se discute por qué ocurre.", by: "Física" },
  { q: "Hay más estrellas en el universo observable que granos de arena en todas las playas de la Tierra.", by: "Astronomía" },
  { q: "Un año luz equivale a casi 9,5 billones de kilómetros.", by: "Astronomía" },
  { q: "El hierro de tu sangre se formó en el interior de estrellas que explotaron hace miles de millones de años.", by: "Astronomía" },
  { q: "El Everest crece unos 4 milímetros al año, empujado por el choque de las placas india y euroasiática.", by: "Geología" },
  { q: "La Gran Muralla china no se distingue a simple vista desde el espacio, por mucho que lo diga el mito.", by: "Geografía" },
  { q: "Eratóstenes calculó el tamaño de la Tierra hacia el 240 a. C. comparando la sombra de un palo en dos ciudades de Egipto.", by: "Historia" },
  { q: "El cero como número nació en la India: Brahmagupta fijó sus reglas de cálculo en el año 628. Los números romanos no tenían cero.", by: "Matemáticas" },
  { q: "Ya se han calculado más de 100 billones de decimales de pi, y nunca se repiten ni terminan.", by: "Matemáticas" },
  { q: "Euclides escribió 'Los Elementos' hace más de 2.300 años, y se usó como libro de geometría durante siglos.", by: "Matemáticas" },
  { q: "Marie Curie es la única persona que ha ganado premios Nobel en dos ciencias distintas: Física y Química.", by: "Ciencia" },
  { q: "Newton desarrolló gran parte del cálculo y de su teoría de la gravedad en 1665 y 1666, cuando la peste cerró la Universidad de Cambridge.", by: "Historia de la ciencia" },
  { q: "Sócrates nunca escribió nada. Lo que sabemos de él lo contaron sobre todo Platón y Jenofonte.", by: "Filosofía" },
  { q: "Aristóteles creía que el cerebro servía para enfriar la sangre y que la mente vivía en el corazón.", by: "Filosofía" },
  { q: "La Academia de Platón funcionó durante casi mil años, hasta que el emperador Justiniano cerró las escuelas paganas en el 529.", by: "Filosofía" },
  { q: "La Biblioteca de Alejandría no ardió en un solo día: se apagó poco a poco, por falta de fondos y crisis políticas durante siglos.", by: "Historia" },
  { q: "Los romanos usaban orina para lavar la ropa: el amoníaco que contiene quita la grasa.", by: "Historia" },
  { q: "La universidad de Oxford enseñaba ya en 1096, mucho antes de que se fundara Tenochtitlan, en 1325.", by: "Historia" },
  { q: "Los delfines se llaman entre sí con silbidos propios, algo parecido a un nombre.", by: "Biología" },
  { q: "Los calamares gigantes tienen los ojos más grandes del reino animal: hasta 27 centímetros, como un balón.", by: "Biología" },
  { q: "Los tardígrados, animales de medio milímetro, han sobrevivido al vacío del espacio y a la radiación.", by: "Biología" },
  { q: "Los koalas tienen huellas dactilares casi idénticas a las humanas.", by: "Biología" },
  { q: "Las mariposas prueban el sabor de las cosas con las patas.", by: "Biología" },
  { q: "Los pingüinos emperador resisten los -40 °C formando grandes grupos y turnándose para ir en el centro, donde hace más calor.", by: "Biología" },
  { q: "Los cuervos reconocen caras humanas y pueden recordar durante años a quien los molestó.", by: "Biología" },
  { q: "Cuando un herbívoro muerde una planta, algunas liberan compuestos en el aire que avisan a las vecinas para que refuercen sus defensas.", by: "Biología" },
  { q: "Bajo un bosque, redes de hongos conectan las raíces de distintos árboles y les permiten intercambiar nutrientes.", by: "Biología" },
  { q: "Un bebé nace con cerca de 300 huesos. De adulto tendrás 206, porque muchos se van fusionando.", by: "Cuerpo humano" },
  { q: "Tu corazón late unas 100.000 veces al día.", by: "Cuerpo humano" },
  { q: "Tu cuerpo fabrica cada segundo unos dos millones de glóbulos rojos.", by: "Cuerpo humano" },
  { q: "Dos personas cualesquiera comparten más del 99,9% de su ADN.", by: "Cuerpo humano" },
  { q: "Mientras duermes profundamente, tu cerebro elimina residuos que se acumulan durante el día. Dormir también es estudiar.", by: "Aprender mejor" },
  { q: "Tras una hora, olvidamos más de la mitad de lo aprendido si no repasamos. Es la curva del olvido de Ebbinghaus, de 1885.", by: "Aprender mejor" },
  { q: "Repasar poco a poco, con pausas entre sesiones, fija mejor la memoria que estudiar todo de golpe. Se llama repetición espaciada.", by: "Aprender mejor" },
  { q: "Hacerte preguntas sobre lo que estudias, como en un quiz, ayuda más a recordar que releer el apunte.", by: "Aprender mejor" },
  { q: "Explicarte la lección en voz alta mejora la comprensión: es el efecto de autoexplicación.", by: "Aprender mejor" },
  { q: "Equivocarte y ver la explicación correcta enseña más que acertar a la primera. El error es parte del método.", by: "Aprender mejor" },
];

// Shuffled deck: every fact shows once before any repeats.
let deck: number[] = [];
let last = -1;
export function nextFact(): Fact {
  if (deck.length === 0) {
    deck = FACTS.map((_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    if (deck[deck.length - 1] === last) deck.reverse(); // do not repeat the one that just played
  }
  last = deck.pop()!;
  return FACTS[last];
}

/** How long the bubble stays: a short fact is gone sooner, a long one gives time to read it (about 2.6 words a second). */
export function factSeconds(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.min(18, Math.max(5, 2.5 + words / 2.6));
}
