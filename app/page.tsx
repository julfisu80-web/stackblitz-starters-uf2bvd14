'use client';

import React, { useMemo, useState, useEffect } from 'react';

/* =========================
   Tipos y catálogos
   ========================= */

type Modality = 'Running' | 'Ciclismo';

type CHOProduct = {
  nombre: string;
  tipo: 'Gel' | 'Barrita' | 'Otro';
  cho: number;
  glucosa: number;
  fructosa: number;
  maltodextrina: number;
  sacarosa: number;
  cafeina: number;
  notas?: string;
};

type DrinkProduct = {
  nombre: string;
  tipo: 'Bebida';
  mlPorPorcion: number;
  choPorPorcion: number;
  sodioPorPorcion: number;
  notas?: string;
};

type ElectrolyteProduct = {
  nombre: string;
  tipo: 'Capsula';
  sodioPorUnidad: number;
  notas?: string;
};

const DEFAULT_CHO_PRODUCTS: CHOProduct[] = [
  {
    nombre: 'Gel 2:1 sin cafeína (25 g)',
    tipo: 'Gel',
    cho: 25,
    glucosa: 16.7,
    fructosa: 8.3,
    maltodextrina: 0,
    sacarosa: 0,
    cafeina: 0,
    notas: 'Mezcla 2:1 sin cafeína',
  },
  {
    nombre: 'Gel 2:1 con cafeína (25 g)',
    tipo: 'Gel',
    cho: 25,
    glucosa: 16.7,
    fructosa: 8.3,
    maltodextrina: 0,
    sacarosa: 0,
    cafeina: 100,
    notas: '100 mg cafeína',
  },
  {
    nombre: 'Barrita 30 g CHO',
    tipo: 'Barrita',
    cho: 30,
    glucosa: 10,
    fructosa: 10,
    maltodextrina: 0,
    sacarosa: 10,
    cafeina: 0,
  },
];

const DEFAULT_DRINKS: DrinkProduct[] = [
  {
    nombre: 'Bebida isotónica 6% (500 ml)',
    tipo: 'Bebida',
    mlPorPorcion: 500,
    choPorPorcion: 30,
    sodioPorPorcion: 300,
    notas: '6 % CHO, ~300 mg Na',
  },
  {
    nombre: 'Bebida concentrada 12% (500 ml)',
    tipo: 'Bebida',
    mlPorPorcion: 500,
    choPorPorcion: 60,
    sodioPorPorcion: 500,
    notas: '12 % CHO, ~500 mg Na',
  },
  {
    nombre: 'Agua (500 ml)',
    tipo: 'Bebida',
    mlPorPorcion: 500,
    choPorPorcion: 0,
    sodioPorPorcion: 0,
    notas: 'Sin CHO ni sodio',
  },
];

const DEFAULT_ELECTROLYTES: ElectrolyteProduct[] = [
  {
    nombre: 'Cápsula sodio 200 mg',
    tipo: 'Capsula',
    sodioPorUnidad: 200,
    notas: '200 mg Na/unidad',
  },
  {
    nombre: 'Cápsula sodio 500 mg',
    tipo: 'Capsula',
    sodioPorUnidad: 500,
    notas: '500 mg Na/unidad',
  },
];

/* =========================
   Utilidades
   ========================= */

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((v) => parseInt(v || '0', 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function durationCategory(hours: number): '≤2,5 h' | '2,5–4 h' | '>4 h' {
  if (hours <= 2.5) return '≤2,5 h';
  if (hours <= 4) return '2,5–4 h';
  return '>4 h';
}

function levelFromScore(score: number): 'Principiante' | 'Intermedio' | 'Avanzado' {
  if (score <= 3) return 'Principiante';
  if (score <= 7) return 'Intermedio';
  return 'Avanzado';
}

function choRange(
  level: 'Principiante' | 'Intermedio' | 'Avanzado',
  durCat: '≤2,5 h' | '2,5–4 h' | '>4 h',
): { low: number; high: number; label: string } {
  if (durCat === '≤2,5 h') {
    if (level === 'Principiante') return { low: 30, high: 45, label: '30–45' };
    if (level === 'Intermedio') return { low: 45, high: 60, label: '45–60' };
    return { low: 60, high: 60, label: '60' };
  }
  if (durCat === '2,5–4 h') {
    if (level === 'Principiante') return { low: 45, high: 60, label: '45–60' };
    if (level === 'Intermedio') return { low: 60, high: 75, label: '60–75' };
    return { low: 75, high: 90, label: '75–90' };
  }
  // >4 h
  if (level === 'Principiante') return { low: 50, high: 70, label: '50–70' };
  if (level === 'Intermedio') return { low: 70, high: 90, label: '70–90' };
  return { low: 90, high: 110, label: '90–110' };
}

function capByGutTraining(
  target: number,
  durCat: '≤2,5 h' | '2,5–4 h' | '>4 h',
  level: 'Principiante' | 'Intermedio' | 'Avanzado',
  gutTraining: boolean,
): number {
  if (gutTraining) return target;
  if (durCat === '≤2,5 h') return target;
  if (level === 'Principiante') return Math.min(target, 55);
  if (level === 'Intermedio') return Math.min(target, 60);
  return Math.min(target, 70);
}

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/* =========================
   Componente principal
   ========================= */

export default function Page() {
  /* Perfil */
  const [modality, setModality] = useState<Modality>('Running');
  const [durationHHMM, setDurationHHMM] = useState('03:30');
  const [paceMinPerKm, setPaceMinPerKm] = useState(5);
  const [speedKmh, setSpeedKmh] = useState(30);
  const [temperature, setTemperature] = useState(20);
  const [gutTraining, setGutTraining] = useState(false);

  /* ==== Registrar SW (ahora dentro del componente) ==== */
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(() => console.log('Service Worker registrado'))
        .catch((err) => console.error('Error registrando SW:', err));
    }
  }, []);

  /* Cuestionario nivel */
  const [qWeeks, setQWeeks] = useState(1);
  const [qSessions, setQSess] = useState(1);
  const [qHours, setQHours] = useState(1);
  const [qLongs, setQLongs] = useState(1);
  const [qGut, setQGut] = useState(0);
  const [qGI, setQGI] = useState(1);

  const minutes = useMemo(() => toMinutes(durationHHMM), [durationHHMM]);
  const hours = minutes / 60;
  const durCat = durationCategory(hours);

  const score = qWeeks + qSessions + qHours + qLongs + qGut + qGI;
  const level = levelFromScore(score);
  const range = choRange(level, durCat);
  const choMid = (range.low + range.high) / 2;
  const choTarget = capByGutTraining(choMid, durCat, level, gutTraining); // g/h

  /* Catálogos */
  const [choProducts, setChoProducts] = useState<CHOProduct[]>(DEFAULT_CHO_PRODUCTS);
  const [drinks, setDrinks] = useState<DrinkProduct[]>(DEFAULT_DRINKS);
  const [electrolytes, setElectrolytes] =
    useState<ElectrolyteProduct[]>(DEFAULT_ELECTROLYTES);

  const [choProductName, setChoProductName] = useState(choProducts[0].nombre);
  const [drinkName, setDrinkName] = useState(drinks[0].nombre);
  const [electrolyteName, setElectrolyteName] = useState(electrolytes[0].nombre);

  const drink = drinks.find((d) => d.nombre === drinkName) || drinks[0];
  const electrolyte =
    electrolytes.find((e) => e.nombre === electrolyteName) || electrolytes[0];
  const choProduct =
    choProducts.find((p) => p.nombre === choProductName) || choProducts[0];

  /* Hidratación por sudor */
  const [sweatRateLh, setSweatRateLh] = useState(0.8);
  const [sweatNaMgL, setSweatNaMgL] = useState(800);
  const [replacePct, setReplacePct] = useState(70);

  const fluidGoalMlH = Math.round(sweatRateLh * 1000 * (replacePct / 100));
  const sodiumGoalMgH = Math.round(sweatRateLh * sweatNaMgL * (replacePct / 100));

  const drinkServH = drink.mlPorPorcion > 0 ? fluidGoalMlH / drink.mlPorPorcion : 0;
  const drinkCHOgh = drink.choPorPorcion * drinkServH;
  const drinkNaMgH = drink.sodioPorPorcion * drinkServH;

  const sodiumGapMgH = Math.max(0, sodiumGoalMgH - drinkNaMgH);
  const electrolytePerH =
    electrolyte.sodioPorUnidad > 0 ? sodiumGapMgH / electrolyte.sodioPorUnidad : 0;

  /* CHO neto para gel/barrita */
  const choTargetNet = Math.max(0, choTarget - drinkCHOgh);

  const intervalMin =
    choTargetNet > 0 && choProduct.cho > 0
      ? round5(60 * (choProduct.cho / choTargetNet))
      : 0;

  const intervalKm = useMemo(() => {
    if (!intervalMin) return 0;
    if (modality === 'Running') {
      const km = intervalMin / paceMinPerKm;
      return Math.round(km * 100) / 100;
    }
    const km = (speedKmh / 60) * intervalMin;
    return Math.round(km * 100) / 100;
  }, [intervalMin, modality, paceMinPerKm, speedKmh]);

  const schedule = useMemo(() => {
    const rows: { idx: number; tMin: number; distKm: number }[] = [];
    if (!intervalMin || !minutes) return rows;
    for (let i = 1; i <= 60; i += 1) {
      const t = i * intervalMin;
      if (t > minutes) break;
      const dist =
        modality === 'Running' ? t / paceMinPerKm : (speedKmh / 60) * t;
      rows.push({ idx: i, tMin: t, distKm: Math.round(dist * 100) / 100 });
    }
    return rows;
  }, [intervalMin, minutes, modality, paceMinPerKm, speedKmh]);

  /* Tasa de sudoración: test simple */
  const [preWeight, setPreWeight] = useState(70);
  const [postWeight, setPostWeight] = useState(69.2);

  // Pesos para calcular líquido ingerido (termo)
  const [bottleBefore, setBottleBefore] = useState(0); // termo lleno antes (g)
  const [bottleAfter, setBottleAfter] = useState(0); // termo con resto de líquido al final (g)

  // Pesos para calcular volumen de orina (opcional)
  const [urineBottleEmpty, setUrineBottleEmpty] = useState(0); // frasco vacío (g)
  const [urineBottleFull, setUrineBottleFull] = useState(0); // frasco con orina (g)

  const [testDurationHHMM, setTestDurationHHMM] = useState('01:30');

  // Cálculo automático de ml ingeridos (g ≈ ml)
  const drinkMl = useMemo(() => {
    if (!bottleBefore || !bottleAfter) return 0;
    const diff = bottleBefore - bottleAfter;
    return diff > 0 ? diff : 0;
  }, [bottleBefore, bottleAfter]);

  // Cálculo automático de ml de orina
  const urineMl = useMemo(() => {
    if (!urineBottleEmpty || !urineBottleFull) return 0;
    const diff = urineBottleFull - urineBottleEmpty;
    return diff > 0 ? diff : 0;
  }, [urineBottleEmpty, urineBottleFull]);

  const sweatRateTestLh = useMemo(() => {
    const durMin = toMinutes(testDurationHHMM);
    if (!durMin || durMin <= 0) return 0;
    const deltaKg = preWeight - postWeight;
    const lossMl = deltaKg * 1000 + drinkMl - urineMl;
    return lossMl / (durMin / 60) / 1000;
  }, [preWeight, postWeight, drinkMl, urineMl, testDurationHHMM]);

  /* Resumen operativo / modo atleta */
  const gelsPerHour =
    choProduct.cho > 0 && choTargetNet > 0
      ? choTargetNet / choProduct.cho
      : 0;

  const drinkIntervalMin = fluidGoalMlH > 0 ? 15 : 0; // sorbos cada 15 min
  const drinkPerIntervalMl =
    drinkIntervalMin && fluidGoalMlH > 0
      ? (fluidGoalMlH / 60) * drinkIntervalMin
      : 0;

  const sodiumIntervalMin =
    electrolytePerH > 0 ? Math.round(60 / electrolytePerH) : 0;
  const capsulesTotal = electrolytePerH * hours;

  const totalChoObjetivo = hours * choTarget; // g totales objetivo
  const totalChoBebida = hours * drinkCHOgh; // g totales aportados por bebida
  const totalChoGel = hours * choTargetNet; // g totales a cubrir con gel/barrita

  const totalFluido = fluidGoalMlH * hours; // ml totales de fluido
  const totalNaObjetivo = sodiumGoalMgH * hours; // mg totales de sodio objetivo
  const totalNaBebida = drinkNaMgH * hours; // mg totales de sodio desde bebida
  const totalNaCaps = Math.max(0, totalNaObjetivo - totalNaBebida); // mg totales extra

  const capsTotales =
    electrolytePerH > 0 && electrolyte.sodioPorUnidad > 0
      ? totalNaCaps / electrolyte.sodioPorUnidad
      : 0;

  const intervaloCapsMin =
    electrolytePerH > 0 ? Math.round(60 / electrolytePerH) : 0;

  /* Tolerancia simple (solo sumar síntomas) */
  const [sx, setSx] = useState({
    nausea: 0,
    plenitud: 0,
    reflujo: 0,
    hinchazon: 0,
    gas: 0,
    colico: 0,
    urgencia: 0,
    diarrea: 0,
    palpit: 0,
    ansiedad: 0,
  });

  const sxSup = sx.nausea + sx.plenitud + sx.reflujo;
  const sxInf = sx.hinchazon + sx.gas + sx.colico + sx.urgencia + sx.diarrea;
  const sxNeuro = sx.palpit + sx.ansiedad;
  const frFrac =
    choProduct.cho > 0 ? choProduct.fructosa / choProduct.cho : 0;

  const sospechas: string[] = [];
  if (sxInf >= 3 && frFrac >= 0.3) sospechas.push('Posible malabsorción de fructosa');
  if (sxSup >= 3 && choProduct.maltodextrina > 0)
    sospechas.push('Osmolaridad alta / maltodextrina');
  if (sxNeuro >= 2 && choProduct.cafeina >= 100)
    sospechas.push('Sensibilidad a cafeína');

  /* Añadir productos rápido */
  const [newCHO, setNewCHO] = useState<CHOProduct>({
    nombre: '',
    tipo: 'Gel',
    cho: 0,
    glucosa: 0,
    fructosa: 0,
    maltodextrina: 0,
    sacarosa: 0,
    cafeina: 0,
  });

  const addCHO = () => {
    if (!newCHO.nombre || !newCHO.cho) return;
    setChoProducts((prev) => [...prev, { ...newCHO }]);
    setChoProductName(newCHO.nombre);
    setNewCHO({
      nombre: '',
      tipo: 'Gel',
      cho: 0,
      glucosa: 0,
      fructosa: 0,
      maltodextrina: 0,
      sacarosa: 0,
      cafeina: 0,
    });
  };

  const [newDrink, setNewDrink] = useState<DrinkProduct>({
    nombre: '',
    tipo: 'Bebida',
    mlPorPorcion: 500,
    choPorPorcion: 0,
    sodioPorPorcion: 0,
  });

  const addDrink = () => {
    if (!newDrink.nombre || !newDrink.mlPorPorcion) return;
    setDrinks((prev) => [...prev, { ...newDrink }]);
    setDrinkName(newDrink.nombre);
    setNewDrink({
      nombre: '',
      tipo: 'Bebida',
      mlPorPorcion: 500,
      choPorPorcion: 0,
      sodioPorPorcion: 0,
    });
  };

  const [newElec, setNewElec] = useState<ElectrolyteProduct>({
    nombre: '',
    tipo: 'Capsula',
    sodioPorUnidad: 200,
  });

  const addElec = () => {
    if (!newElec.nombre || !newElec.sodioPorUnidad) return;
    setElectrolytes((prev) => [...prev, { ...newElec }]);
    setElectrolyteName(newElec.nombre);
    setNewElec({
      nombre: '',
      tipo: 'Capsula',
      sodioPorUnidad: 200,
    });
  };

  /* UI */

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold mb-2">App CHO &amp; Hidratación – MVP</h1>

      {/* PERFIL / NIVEL */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* Perfil */}
        <div className="p-4 rounded-2xl shadow bg-white">
          <h2 className="text-lg font-semibold mb-3">Perfil del atleta</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="col-span-1">
              Modalidad
              <select
                className="w-full border p-2 rounded"
                value={modality}
                onChange={(e) => setModality(e.target.value as Modality)}
              >
                <option>Running</option>
                <option>Ciclismo</option>
              </select>
            </label>
            <label className="col-span-1">
              Duración (hh:mm)
              <input
                className="w-full border p-2 rounded"
                value={durationHHMM}
                onChange={(e) => setDurationHHMM(e.target.value)}
              />
            </label>
            {modality === 'Running' ? (
              <label className="col-span-1">
                Ritmo (min/km)
                <input
                  type="number"
                  step="0.1"
                  className="w-full border p-2 rounded"
                  value={paceMinPerKm}
                  onChange={(e) => setPaceMinPerKm(parseFloat(e.target.value || '0'))}
                />
              </label>
            ) : (
              <label className="col-span-1">
                Velocidad (km/h)
                <input
                  type="number"
                  step="0.1"
                  className="w-full border p-2 rounded"
                  value={speedKmh}
                  onChange={(e) => setSpeedKmh(parseFloat(e.target.value || '0'))}
                />
              </label>
            )}
            <label className="col-span-1">
              Temperatura (°C)
              <input
                type="number"
                className="w-full border p-2 rounded"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value || '0'))}
              />
            </label>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={gutTraining}
                onChange={(e) => setGutTraining(e.target.checked)}
              />
              Entrenamiento intestinal realizado
            </label>
          </div>
          <div className="mt-3 text-xs bg-gray-50 p-2 rounded">
            Duración: <b>{hours.toFixed(2)} h</b> ({durCat})
          </div>
        </div>

        {/* Cuestionario nivel */}
        <div className="p-4 rounded-2xl shadow bg-white">
          <h2 className="text-lg font-semibold mb-3">Cuestionario de nivel</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label>
              Semanas entrenando (&gt;3/sem)
              <select
                className="w-full border p-2 rounded"
                value={qWeeks}
                onChange={(e) => setQWeeks(parseInt(e.target.value, 10))}
              >
                <option value={0}>&lt;6 (0)</option>
                <option value={1}>6–12 (1)</option>
                <option value={2}>&gt;12 (2)</option>
              </select>
            </label>
            <label>
              Sesiones/semana
              <select
                className="w-full border p-2 rounded"
                value={qSessions}
                onChange={(e) => setQSess(parseInt(e.target.value, 10))}
              >
                <option value={0}>≤2 (0)</option>
                <option value={1}>3–4 (1)</option>
                <option value={2}>≥5 (2)</option>
              </select>
            </label>
            <label>
              Horas/semana
              <select
                className="w-full border p-2 rounded"
                value={qHours}
                onChange={(e) => setQHours(parseInt(e.target.value, 10))}
              >
                <option value={0}>&lt;3 (0)</option>
                <option value={1}>3–6 (1)</option>
                <option value={2}>&gt;6 (2)</option>
              </select>
            </label>
            <label>
              Fondos (&gt;2 h) último año
              <select
                className="w-full border p-2 rounded"
                value={qLongs}
                onChange={(e) => setQLongs(parseInt(e.target.value, 10))}
              >
                <option value={0}>Ninguno (0)</option>
                <option value={1}>1–2 (1)</option>
                <option value={2}>≥3 (2)</option>
              </select>
            </label>
            <label>
              Entrenamiento intestinal
              <select
                className="w-full border p-2 rounded"
                value={qGut}
                onChange={(e) => setQGut(parseInt(e.target.value, 10))}
              >
                <option value={0}>No (0)</option>
                <option value={2}>Sí (2)</option>
              </select>
            </label>
            <label>
              Antecedentes GI en carrera
              <select
                className="w-full border p-2 rounded"
                value={qGI}
                onChange={(e) => setQGI(parseInt(e.target.value, 10))}
              >
                <option value={0}>Frecuente (0)</option>
                <option value={1}>Ocasional (1)</option>
                <option value={2}>Raro (2)</option>
              </select>
            </label>
          </div>
          <div className="mt-3 text-xs bg-gray-50 p-2 rounded space-y-1">
            <div>
              Puntaje: <b>{score}</b>
            </div>
            <div>
              Nivel: <b>{level}</b>
            </div>
            <div>
              Rango sugerido CHO: <b>{range.label}</b> g/h
            </div>
            <div>
              CHO objetivo (ajustado por entrenamiento intestinal):{' '}
              <b>{choTarget.toFixed(0)} g/h</b>
            </div>
          </div>
        </div>
      </section>

      {/* TEST DE SUDORACIÓN SIMPLE */}
      <section className="p-4 rounded-2xl shadow bg-white">
        <h2 className="text-lg font-semibold mb-2">
          Test rápido de tasa de sudoración
        </h2>

        {/* Descripción general */}
        <p className="text-sm text-gray-700 mb-2">
          Test práctico para estimar cuánta <b>agua</b> pierdes por hora en condiciones
          similares a tu competencia. Idealmente usar una sesión de ≥45–60 min a
          intensidad habitual.
        </p>

        {/* Bloque de materiales y pasos */}
        <div className="grid md:grid-cols-2 gap-3 mb-3 text-sm">
          <div className="bg-gray-50 rounded-xl p-3">
            <h3 className="font-semibold text-gray-800 mb-1">Material necesario</h3>
            <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
              <li>Báscula de peso corporal.</li>
              <li>Gramera o báscula de cocina.</li>
              <li>Termo / caramañola que usarás durante el entrenamiento.</li>
              <li>Frasco para orina (opcional).</li>
              <li>
                Registro de <b>temperatura</b> y <b>humedad</b> del día
                (app del clima o similar).
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <h3 className="font-semibold text-gray-800 mb-1">Cómo hacer el test</h3>
            <ol className="list-decimal list-inside text-xs text-gray-700 space-y-1">
              <li>Pésate <b>antes</b> del entrenamiento (tras ir al baño).</li>
              <li>Pesa el <b>termo lleno</b> antes de salir.</li>
              <li>Durante la sesión, bebe solo de ese termo. Si orinas, usa el frasco.</li>
              <li>Al terminar, pésate de nuevo.</li>
              <li>Pesa el <b>termo al final</b> (con el líquido que queda).</li>
              <li>
                Si mides orina, pesa el <b>frasco vacío</b> y el{' '}
                <b>frasco con orina</b>.
              </li>
            </ol>
            <p className="text-[11px] text-gray-600 mt-1">
              La app calcula automáticamente los ml bebidos y la orina usando las
              diferencias de peso (1 g ≈ 1 ml).
            </p>
          </div>
        </div>

        {/* Formulario de datos */}
        <div className="grid md:grid-cols-5 gap-3 text-sm">
          <label>
            Peso antes (kg)
            <input
              type="number"
              className="w-full border p-2 rounded"
              value={preWeight}
              onChange={(e) => setPreWeight(parseFloat(e.target.value || '0'))}
            />
          </label>
          <label>
            Peso después (kg)
            <input
              type="number"
              className="w-full border p-2 rounded"
              value={postWeight}
              onChange={(e) => setPostWeight(parseFloat(e.target.value || '0'))}
            />
          </label>
          <label>
            Termo lleno antes (g)
            <input
              type="number"
              className="w-full border p-2 rounded"
              value={bottleBefore}
              onChange={(e) =>
                setBottleBefore(parseFloat(e.target.value || '0'))
              }
            />
          </label>
          <label>
            Termo al final (g)
            <input
              type="number"
              className="w-full border p-2 rounded"
              value={bottleAfter}
              onChange={(e) =>
                setBottleAfter(parseFloat(e.target.value || '0'))
              }
            />
          </label>
          <label>
            Duración prueba (hh:mm)
            <input
              className="w-full border p-2 rounded"
              value={testDurationHHMM}
              onChange={(e) => setTestDurationHHMM(e.target.value)}
            />
          </label>
        </div>

        {/* Bloque de orina y resultados intermedios */}
        <div className="grid md:grid-cols-4 gap-3 text-sm mt-3">
          <label>
            Frasco orina vacío (g, opcional)
            <input
              type="number"
              className="w-full border p-2 rounded"
              value={urineBottleEmpty}
              onChange={(e) =>
                setUrineBottleEmpty(parseFloat(e.target.value || '0'))
              }
            />
          </label>
          <label>
            Frasco con orina (g, opcional)
            <input
              type="number"
              className="w-full border p-2 rounded"
              value={urineBottleFull}
              onChange={(e) =>
                setUrineBottleFull(parseFloat(e.target.value || '0'))
              }
            />
          </label>

          <div className="bg-gray-50 p-3 rounded text-xs md:col-span-2 space-y-1">
            <div>
              Líquido ingerido estimado: <b>{drinkMl.toFixed(0)} ml</b>
            </div>
            <div>
              Orina estimada: <b>{urineMl.toFixed(0)} ml</b>
            </div>
            <p className="text-[11px] text-gray-600">
              Cálculo a partir de la diferencia de peso: termo lleno − termo al
              final, y frasco con orina − frasco vacío (1 g ≈ 1 ml).
            </p>
          </div>
        </div>

        {/* Resultado final */}
        <div className="mt-3 text-sm bg-gray-50 p-3 rounded">
          Tasa de sudoración estimada:{' '}
          <b>{sweatRateTestLh > 0 ? sweatRateTestLh.toFixed(2) : '0.00'} L/h</b>
          <p className="text-xs text-gray-600 mt-1">
            Valores típicos en deportistas bien entrenados suelen estar entre ~0,5
            y 1,5 L/h, pero pueden ser mayores en calor intenso. Usa este valor
            como referencia para la casilla de &quot;Tasa de sudoración (L/h)&quot;
            en la sección de hidratación y registra siempre temperatura y humedad.
          </p>
        </div>
      </section>

      {/* HIDRATACIÓN */}
      <section className="p-4 rounded-2xl shadow bg-white">
        <h2 className="text-lg font-semibold mb-2">
          Hidratación (tasa de sudoración y sodio)
        </h2>
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <label>
            Tasa de sudoración (L/h)
            <input
              type="number"
              step="0.1"
              className="w-full border p-2 rounded"
              value={sweatRateLh}
              onChange={(e) => setSweatRateLh(parseFloat(e.target.value || '0'))}
            />
          </label>
          <label>
            Sodio en sudor (mg/L)
            <input
              type="number"
              step="10"
              className="w-full border p-2 rounded"
              value={sweatNaMgL}
              onChange={(e) => setSweatNaMgL(parseFloat(e.target.value || '0'))}
            />
          </label>
          <label>
            Reposición objetivo (%)
            <input
              type="number"
              step="5"
              className="w-full border p-2 rounded"
              value={replacePct}
              onChange={(e) => setReplacePct(parseFloat(e.target.value || '0'))}
            />
          </label>
          <div className="bg-gray-50 p-3 rounded text-sm">
            <div>
              Fluido objetivo: <b>{fluidGoalMlH}</b> ml/h
            </div>
            <div>
              Sodio objetivo: <b>{sodiumGoalMgH}</b> mg/h
            </div>
          </div>
          <label className="col-span-2">
            Bebida
            <select
              className="w-full border p-2 rounded"
              value={drinkName}
              onChange={(e) => setDrinkName(e.target.value)}
            >
              {drinks.map((d) => (
                <option key={d.nombre}>{d.nombre}</option>
              ))}
            </select>
          </label>
          <label className="col-span-2">
            Cápsula/electrolito (opcional)
            <select
              className="w-full border p-2 rounded"
              value={electrolyteName}
              onChange={(e) => setElectrolyteName(e.target.value)}
            >
              {electrolytes.map((el) => (
                <option key={el.nombre}>{el.nombre}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-2 text-xs text-gray-600">
          Si no dispones de un test de laboratorio de sudor, la mayoría de
          deportistas se sitúa de forma orientativa entre <b>≈400 y 800 mg/L</b>{' '}
          de sodio; algunos pierden menos (~300 mg/L) y los &quot;saladores&quot;
          pueden estar por encima de 900–1000 mg/L. Si tienes un resultado real
          de test de sudoración, utiliza ese valor en esta casilla.
        </p>

        <div className="mt-3 grid md:grid-cols-4 gap-3 text-sm bg-gray-50 p-3 rounded">
          <div>
            Porciones bebida/h: <b>{drinkServH.toFixed(2)}</b>
          </div>
          <div>
            CHO bebida: <b>{drinkCHOgh.toFixed(0)}</b> g/h
          </div>
          <div>
            Na bebida: <b>{drinkNaMgH.toFixed(0)}</b> mg/h
          </div>
          <div>
            Déficit Na: <b>{sodiumGapMgH.toFixed(0)}</b> mg/h → Cápsulas/h:{' '}
            <b>{electrolytePerH.toFixed(2)}</b>
          </div>
        </div>
      </section>

      {/* PLAN DE COMPETENCIA */}
      <section className="p-4 rounded-2xl shadow bg-white">
        <h2 className="text-lg font-semibold mb-2">
          Plan de competencia (CHO neto con geles/barritas)
        </h2>
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <label className="col-span-2">
            Producto CHO
            <select
              className="w-full border p-2 rounded"
              value={choProductName}
              onChange={(e) => setChoProductName(e.target.value)}
            >
              {choProducts.map((p) => (
                <option key={p.nombre}>{p.nombre}</option>
              ))}
            </select>
          </label>
          <div className="bg-gray-50 p-2 rounded">
            CHO total objetivo: <b>{(hours * choTarget).toFixed(0)} g</b>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            CHO bebida: <b>{(hours * drinkCHOgh).toFixed(0)} g</b>
          </div>
          <div className="bg-gray-50 p-2 rounded col-span-2">
            CHO a cubrir con gel/barrita:{' '}
            <b>{(hours * choTargetNet).toFixed(0)} g</b>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            Intervalo aprox: <b>{intervalMin || '—'} min</b>{' '}
            {intervalKm ? `(${intervalKm} km)` : '(según ritmo)'}
          </div>
          <div className="bg-gray-50 p-2 rounded">
            Unidades totales (aprox):{' '}
            <b>
              {choProduct.cho > 0
                ? Math.ceil((hours * choTargetNet) / choProduct.cho)
                : '—'}
            </b>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Tiempo (min)</th>
                <th className="p-2 text-left">Distancia acumulada (km)</th>
                <th className="p-2 text-left">Producto</th>
                <th className="p-2 text-left">Unidades</th>
                <th className="p-2 text-left">CHO acumulado (g)</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr key={row.idx} className="border-b">
                  <td className="p-2">{row.idx}</td>
                  <td className="p-2">{row.tMin}</td>
                  <td className="p-2">{row.distKm}</td>
                  <td className="p-2">{choProduct.nombre}</td>
                  <td className="p-2">1</td>
                  <td className="p-2">
                    {(choProduct.cho * (i + 1)).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* TOLERANCIA */}
      <section className="p-4 rounded-2xl shadow bg-white">
        <h2 className="text-lg font-semibold mb-2">
          Tolerancia e intolerancias (screening)
        </h2>
        <div className="grid md:grid-cols-5 gap-3 text-sm">
          {(
            [
              ['Náusea', 'nausea'],
              ['Plenitud', 'plenitud'],
              ['Reflujo', 'reflujo'],
              ['Hinchazón', 'hinchazon'],
              ['Gas', 'gas'],
              ['Cólico', 'colico'],
              ['Urgencia', 'urgencia'],
              ['Diarrea', 'diarrea'],
              ['Palpitaciones', 'palpit'],
              ['Ansiedad', 'ansiedad'],
            ] as const
          ).map(([label, key]) => (
            <label key={key} className="flex flex-col text-xs">
              {label} (0–3)
              <input
                type="number"
                min={0}
                max={3}
                className="border p-2 rounded"
                value={(sx as any)[key]}
                onChange={(e) =>
                  setSx((prev) => ({
                    ...prev,
                    [key]: Math.max(
                      0,
                      Math.min(3, parseInt(e.target.value || '0', 10)),
                    ),
                  }))
                }
              />
            </label>
          ))}
        </div>
        <div className="mt-3 text-xs bg-gray-50 p-3 rounded space-y-1">
          <div>
            Sup: <b>{sxSup}</b> | Inf: <b>{sxInf}</b> | Neuro: <b>{sxNeuro}</b>{' '}
            | Fructosa del producto: <b>{(frFrac * 100).toFixed(0)}%</b>
          </div>
          <div>
            Sospechas: {sospechas.length ? sospechas.join(', ') : '—'}
          </div>
          <div>
            Sugerencias rápidas:{' '}
            {sospechas.includes('Posible malabsorción de fructosa') &&
              'Elegir gel/bebida con menos fructosa o sin ella. '}
            {sospechas.includes('Osmolaridad alta / maltodextrina') &&
              'Bajar concentración de CHO (6–8 %) o cambiar a productos menos concentrados. '}
            {sospechas.includes('Sensibilidad a cafeína') &&
              'Reducir o eliminar la cafeína antes y durante la prueba.'}
            {!sospechas.length &&
              'Sin señales claras; seguir monitorizando en entrenamientos.'}
          </div>
        </div>
      </section>

      {/* CATÁLOGO RÁPIDO */}
      <section className="p-4 rounded-2xl shadow bg-white">
        <h2 className="text-lg font-semibold mb-3">
          Catálogo de productos (edición rápida)
        </h2>
        <div className="mb-4">
          <h3 className="font-semibold mb-1 text-sm">
            Añadir producto CHO (gel/barrita)
          </h3>
          <div className="grid md:grid-cols-6 gap-2 text-xs">
            <input
              className="border p-2 rounded"
              placeholder="Nombre"
              value={newCHO.nombre}
              onChange={(e) => setNewCHO({ ...newCHO, nombre: e.target.value })}
            />
            <select
              className="border p-2 rounded"
              value={newCHO.tipo}
              onChange={(e) =>
                setNewCHO({
                  ...newCHO,
                  tipo: e.target.value as CHOProduct['tipo'],
                })
              }
            >
              <option>Gel</option>
              <option>Barrita</option>
              <option>Otro</option>
            </select>
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="CHO g/unid"
              value={newCHO.cho}
              onChange={(e) =>
                setNewCHO({ ...newCHO, cho: parseFloat(e.target.value || '0') })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="Glucosa g"
              value={newCHO.glucosa}
              onChange={(e) =>
                setNewCHO({
                  ...newCHO,
                  glucosa: parseFloat(e.target.value || '0'),
                })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="Fructosa g"
              value={newCHO.fructosa}
              onChange={(e) =>
                setNewCHO({
                  ...newCHO,
                  fructosa: parseFloat(e.target.value || '0'),
                })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="Maltodex g"
              value={newCHO.maltodextrina}
              onChange={(e) =>
                setNewCHO({
                  ...newCHO,
                  maltodextrina: parseFloat(e.target.value || '0'),
                })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="Sacarosa g"
              value={newCHO.sacarosa}
              onChange={(e) =>
                setNewCHO({
                  ...newCHO,
                  sacarosa: parseFloat(e.target.value || '0'),
                })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="Cafeína mg"
              value={newCHO.cafeina}
              onChange={(e) =>
                setNewCHO({
                  ...newCHO,
                  cafeina: parseFloat(e.target.value || '0'),
                })
              }
            />
            <button
              type="button"
              className="border p-2 rounded col-span-2"
              onClick={addCHO}
            >
              Añadir CHO
            </button>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-1 text-sm">Añadir bebida</h3>
          <div className="grid md:grid-cols-6 gap-2 text-xs">
            <input
              className="border p-2 rounded"
              placeholder="Nombre"
              value={newDrink.nombre}
              onChange={(e) =>
                setNewDrink({ ...newDrink, nombre: e.target.value })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="ml/porción"
              value={newDrink.mlPorPorcion}
              onChange={(e) =>
                setNewDrink({
                  ...newDrink,
                  mlPorPorcion: parseFloat(e.target.value || '0'),
                })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="CHO g/porción"
              value={newDrink.choPorPorcion}
              onChange={(e) =>
                setNewDrink({
                  ...newDrink,
                  choPorPorcion: parseFloat(e.target.value || '0'),
                })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="Na mg/porción"
              value={newDrink.sodioPorPorcion}
              onChange={(e) =>
                setNewDrink({
                  ...newDrink,
                  sodioPorPorcion: parseFloat(e.target.value || '0'),
                })
              }
            />
            <div className="col-span-2 flex items-center">
              <button
                type="button"
                className="border p-2 rounded w-full"
                onClick={addDrink}
              >
                Añadir bebida
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-1 text-sm">
            Añadir cápsula/electrolito
          </h3>
          <div className="grid md:grid-cols-6 gap-2 text-xs">
            <input
              className="border p-2 rounded"
              placeholder="Nombre"
              value={newElec.nombre}
              onChange={(e) =>
                setNewElec({ ...newElec, nombre: e.target.value })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="Na mg/unidad"
              value={newElec.sodioPorUnidad}
              onChange={(e) =>
                setNewElec({
                  ...newElec,
                  sodioPorUnidad: parseFloat(e.target.value || '0'),
                })
              }
            />
            <div className="col-span-2 flex items-center">
              <button
                type="button"
                className="border p-2 rounded w-full"
                onClick={addElec}
              >
                Añadir electrolito
              </button>
            </div>
          </div>
        </div>

        {/* Vista rápida catálogos */}
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <h4 className="font-semibold mb-1">Catálogo CHO</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Producto</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-left">CHO</th>
                    <th className="p-2 text-left">Glucosa</th>
                    <th className="p-2 text-left">Fructosa</th>
                    <th className="p-2 text-left">Maltodex</th>
                    <th className="p-2 text-left">Sacarosa</th>
                    <th className="p-2 text-left">Cafeína</th>
                  </tr>
                </thead>
                <tbody>
                  {choProducts.map((p) => (
                    <tr key={p.nombre} className="border-b">
                      <td className="p-2">{p.nombre}</td>
                      <td className="p-2">{p.tipo}</td>
                      <td className="p-2">{p.cho}</td>
                      <td className="p-2">{p.glucosa}</td>
                      <td className="p-2">{p.fructosa}</td>
                      <td className="p-2">{p.maltodextrina}</td>
                      <td className="p-2">{p.sacarosa}</td>
                      <td className="p-2">{p.cafeina}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Catálogo hidratación</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Bebida</th>
                    <th className="p-2 text-left">ml/porción</th>
                    <th className="p-2 text-left">CHO/porción</th>
                    <th className="p-2 text-left">Na/porción</th>
                  </tr>
                </thead>
                <tbody>
                  {drinks.map((d) => (
                    <tr key={d.nombre} className="border-b">
                      <td className="p-2">{d.nombre}</td>
                      <td className="p-2">{d.mlPorPorcion}</td>
                      <td className="p-2">{d.choPorPorcion}</td>
                      <td className="p-2">{d.sodioPorPorcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3" />
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Electrolito</th>
                    <th className="p-2 text-left">Na/unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {electrolytes.map((el) => (
                    <tr key={el.nombre} className="border-b">
                      <td className="p-2">{el.nombre}</td>
                      <td className="p-2">{el.sodioPorUnidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* MODO ATLETA – RESUMEN OPERATIVO */}
      <section className="p-4 rounded-2xl shadow bg-white">
        <h2 className="text-lg font-semibold mb-2">Modo atleta – resumen operativo</h2>

        {/* Tarjetas con los 3 objetivos clave */}
        <div className="grid md:grid-cols-3 gap-3 mb-4 text-sm">
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="text-xs text-gray-600">Carbohidratos</div>
            <div className="text-2xl font-bold">
              {choTarget ? choTarget.toFixed(0) : '—'} g/h
            </div>
            <div className="text-[11px] text-gray-600 mt-1">
              Objetivo aproximado por hora (suma de bebida + gel/barrita).
            </div>
          </div>

          <div className="bg-teal-50 rounded-xl p-3">
            <div className="text-xs text-gray-600">Hidratación</div>
            <div className="text-2xl font-bold">
              {fluidGoalMlH ? fluidGoalMlH.toFixed(0) : '—'} ml/h
            </div>
            <div className="text-[11px] text-gray-600 mt-1">
              Beber en pequeños sorbos regulares, no de una sola vez.
            </div>
          </div>

          <div className="bg-yellow-50 rounded-xl p-3">
            <div className="text-xs text-gray-600">Sodio</div>
            <div className="text-2xl font-bold">
              {sodiumGoalMgH ? sodiumGoalMgH.toFixed(0) : '—'} mg/h
            </div>
            <div className="text-[11px] text-gray-600 mt-1">
              Suma de lo que aporta la bebida + cápsulas/electrolitos.
            </div>
          </div>
        </div>

        {/* Resumen total de la sesión */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-700 space-y-1">
          <div>
            <b>Duración estimada:</b> {hours.toFixed(2)} h ({minutes.toFixed(0)} min)
          </div>
          <div>
            <b>CHO total objetivo:</b> {totalChoObjetivo.toFixed(0)} g | bebida:{' '}
            {totalChoBebida.toFixed(0)} g | gel/barrita: {totalChoGel.toFixed(0)} g
          </div>
          <div>
            <b>Fluido total objetivo:</b> {totalFluido.toFixed(0)} ml
          </div>
          <div>
            <b>Sodio total objetivo:</b> {totalNaObjetivo.toFixed(0)} mg | bebida:{' '}
            {totalNaBebida.toFixed(0)} mg | extra: {totalNaCaps.toFixed(0)} mg
          </div>
          {capsTotales > 0 && (
            <div>
              <b>Cápsulas totales (aprox.):</b> {capsTotales.toFixed(1)}{' '}
              {electrolyte?.nombre && `(${electrolyte.nombre})`}
            </div>
          )}
        </div>

        {/* Cuadro operativo simple */}
        <h3 className="text-sm font-semibold mb-2">Cuadro operativo para la carrera</h3>
        <p className="text-xs text-gray-700 mb-2">
          Esta tabla resume <b>cuándo</b> tomar el gel/barrita, y orientaciones para
          hidratarte y usar sodio extra. Ajusta siempre según tolerancia y lo ya
          probado en entrenamiento.
        </p>

        <div className="overflow-x-auto mb-3">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Tiempo</th>
                <th className="p-2 text-left">
                  Distancia {modality === 'Running' ? '(km)' : '(km bici)'}
                </th>
                <th className="p-2 text-left">Acción principal</th>
                <th className="p-2 text-left">Comentario</th>
              </tr>
            </thead>
            <tbody>
              {schedule.length === 0 ? (
                <tr>
                  <td className="p-2 text-center text-gray-500" colSpan={5}>
                    Ajusta duración, objetivo de CHO y producto para generar un plan.
                  </td>
                </tr>
              ) : (
                schedule.map((row, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{row.idx}</td>
                    <td className="p-2">{row.tMin} min</td>
                    <td className="p-2">{row.distKm}</td>
                    <td className="p-2">
                      Tomar 1 unidad de {choProduct.nombre}
                    </td>
                    <td className="p-2">
                      Mantener sorbos frecuentes de{' '}
                      {drinkName ? drinkName.toLowerCase() : 'bebida'} para
                      aproximar {fluidGoalMlH.toFixed(0)} ml/h.
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recomendación sobre sodio extra */}
        <div className="bg-blue-50 rounded-xl p-3 text-xs text-gray-800">
          <b>Sodio extra (cápsulas/electrolitos):</b>{' '}
          {electrolytePerH > 0 ? (
            <>
              objetivo aproximado de {sodiumGapMgH.toFixed(0)} mg/h adicionales. Con{' '}
              {electrolyte.nombre} ({electrolyte.sodioPorUnidad} mg Na/unidad),
              esto equivale a ~{electrolytePerH.toFixed(2)} cápsulas por hora
              {intervaloCapsMin > 0 && ` (1 cápsula cada ~${intervaloCapsMin} min)`}.
            </>
          ) : (
            <>
              con la bebida seleccionada ya se cubre o casi se cubre el objetivo
              de sodio. Puede no ser necesario sodio extra, salvo condiciones de
              mucho calor o sudor muy salado.
            </>
          )}
        </div>

        <p className="mt-3 text-[11px] text-gray-600 leading-tight">
          Este modo está pensado como vista rápida para el deportista. No sustituye
          la valoración individual ni los ajustes finos de un profesional de la
          salud o nutrición deportiva.
        </p>
      </section>

      {/* BIBLIOGRAFÍA CIENTÍFICA */}
      <section className="p-4 rounded-2xl shadow bg-white">
        <h2 className="text-lg font-semibold mb-2">Bibliografía científica</h2>
        <p className="text-sm text-gray-700 mb-3">
          Referencias clave en las que se basan los rangos de carbohidratos,
          hidratación, sodio y entrenamiento intestinal utilizados en esta
          herramienta.
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs text-gray-800">
          <li>
            Jeukendrup AE. A step towards personalized sports nutrition:
            carbohydrate intake during exercise. <i>Sports Medicine</i>.
            2014;44(Suppl 1):25-33.
          </li>
          <li>
            Jeukendrup AE. Carbohydrate intake during exercise and performance.{' '}
            <i>Sports Medicine</i>. 2004;34(4):171-180.
          </li>
          <li>
            Stellingwerff T, Cox GR. Systematic review: carbohydrate
            supplementation in endurance athletes. <i>Sports Medicine</i>.
            2014;44:S17-S27.
          </li>
          <li>
            American College of Sports Medicine. Position Stand: Exercise and
            Fluid Replacement. <i>Medicine and Science in Sports and Exercise</i>.
            2007;39(2):377-390.
          </li>
          <li>
            Baker LB. Sweating rate and sweat sodium concentration in athletes:
            a review of methodology and variability. <i>Sports Medicine</i>.
            2017;47:111-128.
          </li>
          <li>
            Barnes KA et al. Normative data for sweating rate, sweat sodium
            concentration and sweat sodium loss in athletes.{' '}
            <i>Journal of Sports Sciences</i>. 2019;37(20):2356-2366.
          </li>
          <li>
            Costa RJS et al. Exercise-induced gastrointestinal syndrome in
            endurance sports. <i>Sports Medicine</i>. 2017;47(Suppl 1):99-112.
          </li>
          <li>
            Costa RJS et al. Gut-training: impact of two weeks of repetitive
            gut-challenge during exercise.{' '}
            <i>Applied Physiology, Nutrition, and Metabolism</i>.
            2017;42(5):547-557.
          </li>
        </ul>
      </section>

      <footer className="text-xs text-gray-500 mt-4">
        MVP educativo. Ajuste rangos/umbrales según evidencia y prueba en
        entrenamiento. Este material no reemplaza consejo clínico individual.
      </footer>
    </div>
  );
}
