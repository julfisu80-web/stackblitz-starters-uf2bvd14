'use client';

import React, { useMemo, useState, useEffect } from 'react';

/* =========================
   Tipos
   ========================= */
type Modality = 'Running' | 'Ciclismo';

type CHOProduct = {
  nombre: string;
  tipo: 'Gel' | 'Barrita' | 'Otro';
  cho: number; // g por unidad
  glucosa: number; // g
  fructosa: number; // g
  maltodextrina: number; // g
  sacarosa: number; // g
  cafeina: number; // mg
  notas?: string;
};

type DrinkProduct = {
  nombre: string;
  tipo: 'Bebida';
  mlPorPorcion: number; // ml/porción (ej: 500 ml)
  choPorPorcion: number; // g CHO/porción
  sodioPorPorcion: number; // mg Na/porción
  notas?: string;
};

type ElectrolyteProduct = {
  nombre: string;
  tipo: 'Capsula';
  sodioPorUnidad: number; // mg Na/unidad
  notas?: string;
};

/* =========================
   Catálogos por defecto
   ========================= */
const DEFAULT_CHO_PRODUCTS: CHOProduct[] = [
  {
    nombre: 'Gel 2:1 sin cafeína (25g)',
    tipo: 'Gel',
    cho: 25,
    glucosa: 16.7,
    fructosa: 8.3,
    maltodextrina: 0,
    sacarosa: 0,
    cafeina: 0,
    notas: 'Mezcla 2:1',
  },
  {
    nombre: 'Gel 2:1 con cafeína (25g)',
    tipo: 'Gel',
    cho: 25,
    glucosa: 16.7,
    fructosa: 8.3,
    maltodextrina: 0,
    sacarosa: 0,
    cafeina: 100,
    notas: 'Cafeína 100 mg',
  },
  {
    nombre: 'Gel solo glucosa (30g)',
    tipo: 'Gel',
    cho: 30,
    glucosa: 30,
    fructosa: 0,
    maltodextrina: 0,
    sacarosa: 0,
    cafeina: 0,
  },
  {
    nombre: 'Gel alto en fructosa (30g)',
    tipo: 'Gel',
    cho: 30,
    glucosa: 10,
    fructosa: 20,
    maltodextrina: 0,
    sacarosa: 0,
    cafeina: 0,
  },
  {
    nombre: 'Barrita con sacarosa (30g)',
    tipo: 'Barrita',
    cho: 30,
    glucosa: 10,
    fructosa: 0,
    maltodextrina: 0,
    sacarosa: 20,
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
    notas: 'Aprox. 6% CHO, ~300 mg Na',
  },
  {
    nombre: 'Bebida concentrada 12% (500 ml)',
    tipo: 'Bebida',
    mlPorPorcion: 500,
    choPorPorcion: 60,
    sodioPorPorcion: 500,
    notas: 'Aprox. 12% CHO, ~500 mg Na',
  },
  {
    nombre: 'Agua (500 ml)',
    tipo: 'Bebida',
    mlPorPorcion: 500,
    choPorPorcion: 0,
    sodioPorPorcion: 0,
    notas: 'Sin CHO ni Na',
  },
];

const DEFAULT_ELECTROLYTES: ElectrolyteProduct[] = [
  {
    nombre: 'Cápsula sodio 200 mg',
    tipo: 'Capsula',
    sodioPorUnidad: 200,
    notas: '200 mg Na',
  },
  {
    nombre: 'Cápsula sodio 500 mg',
    tipo: 'Capsula',
    sodioPorUnidad: 500,
    notas: '500 mg Na',
  },
];

/* =========================
   Utilidades
   ========================= */
function toMinutes(hhmm: string): number | null {
  if (!hhmm) return null;
  const parts = hhmm.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

function levelFromScore(
  score: number
): 'Principiante' | 'Intermedio' | 'Avanzado' {
  if (score <= 3) return 'Principiante';
  if (score <= 7) return 'Intermedio';
  return 'Avanzado';
}

function durationCategory(hours: number) {
  if (hours <= 2.5) return '≤2,5 h';
  if (hours <= 4) return '2,5–4 h';
  return '>4 h';
}

function choRange(
  level: string,
  durCat: string
): { low: number; high: number; label: string } | null {
  if (!level || !durCat) return null;
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
  durCat: string,
  level: string,
  gutTraining: boolean
): number {
  if (gutTraining) return target;
  if (durCat === '≤2,5 h') return target;
  if (level === 'Principiante') return Math.min(target, 55);
  if (level === 'Intermedio') return Math.min(target, 60);
  return Math.min(target, 70);
}

/* =========================
   Componente principal
   ========================= */
export default function AppCHO() {
  /* ---------- Perfil / Nivel ---------- */
  const [modality, setModality] = useState<Modality>('Running');
  const [durationHHMM, setDurationHHMM] = useState('03:30');
  const [paceMinPerKm, setPaceMinPerKm] = useState(5.0); // running
  const [speedKmh, setSpeedKmh] = useState(30); // ciclismo
  const [temperature, setTemperature] = useState(20);
  const [gutTraining, setGutTraining] = useState(false);

  const [qWeeks, setQWeeks] = useState(1);
  const [qSessions, setQSess] = useState(1);
  const [qHours, setQHours] = useState(1);
  const [qLongs, setQLongs] = useState(1);
  const [qGut, setQGut] = useState(0);
  const [qGI, setQGI] = useState(1);

  const minutes = useMemo(() => toMinutes(durationHHMM) ?? 0, [durationHHMM]);
  const hours = minutes / 60;
  const durCat = durationCategory(hours);

  const score = qWeeks + qSessions + qHours + qLongs + qGut + qGI;
  const level = levelFromScore(score);
  const range = choRange(level, durCat);
  const choMid = range ? (range.low + range.high) / 2 : 0;
  const choTarget = capByGutTraining(choMid, durCat, level, gutTraining); // g/h

  /* ---------- Catálogo: CHO ---------- */
  const [choProducts, setChoProducts] =
    useState<CHOProduct[]>(DEFAULT_CHO_PRODUCTS);
  const [choProductName, setChoProductName] = useState(choProducts[0].nombre);

  /* ---------- Catálogo: Hidratación ---------- */
  const [drinks, setDrinks] = useState<DrinkProduct[]>(DEFAULT_DRINKS);
  const [electrolytes, setElectrolytes] =
    useState<ElectrolyteProduct[]>(DEFAULT_ELECTROLYTES);

  const [drinkName, setDrinkName] = useState(drinks[0].nombre);
  const [electrolyteName, setElectrolyteName] = useState(
    electrolytes[0].nombre
  );

  /* ---------- Hidratación (sudor) ---------- */
  const [sweatRateLh, setSweatRateLh] = useState(0.8); // L/h
  const [sweatNaMgL, setSweatNaMgL] = useState(800); // mg/L
  const [replacePct, setReplacePct] = useState(70); // % reposición (fluido y Na)

  const drink = drinks.find((d) => d.nombre === drinkName) || drinks[0];
  const electrolyte =
    electrolytes.find((e) => e.nombre === electrolyteName) || electrolytes[0];

  // Objetivos por hora
  const fluidGoalMlH = Math.round(sweatRateLh * 1000 * (replacePct / 100)); // ml/h
  const sodiumGoalMgH = Math.round(
    sweatRateLh * sweatNaMgL * (replacePct / 100)
  ); // mg/h

  // Servicio(s) de bebida por hora para cumplir fluido
  const drinkServH =
    drink.mlPorPorcion > 0 ? fluidGoalMlH / drink.mlPorPorcion : 0;
  const drinkCHOgh = drink.choPorPorcion * drinkServH; // g/h aportados por bebida
  const drinkNaMgH = drink.sodioPorPorcion * drinkServH; // mg/h aportados por bebida

  // Déficit de sodio (si bebida no alcanza)
  const sodiumGapMgH = Math.max(0, sodiumGoalMgH - drinkNaMgH);
  const electrolytePerH =
    electrolyte.sodioPorUnidad > 0
      ? sodiumGapMgH / electrolyte.sodioPorUnidad
      : 0;

  /* ---------- Objetivo CHO neto (para gel/barrita) ---------- */
  const choTargetNet = Math.max(0, choTarget - drinkCHOgh); // g/h restantes

  const choProduct =
    choProducts.find((p) => p.nombre === choProductName) || choProducts[0];

  // Intervalo por tiempo en función de CHO por unidad y objetivo neto
  const intervalMin =
    choTargetNet > 0 ? round5(60 * (choProduct.cho / choTargetNet)) : 0;

  const intervalKm = useMemo(() => {
    if (intervalMin === 0) return 0;
    if (modality === 'Running') {
      const km = intervalMin / paceMinPerKm; // min / (min/km) = km
      return Math.round(km * 100) / 100;
    } else {
      const km = (speedKmh / 60) * intervalMin;
      return Math.round(km * 100) / 100;
    }
  }, [intervalMin, modality, paceMinPerKm, speedKmh]);

  const schedule = useMemo(() => {
    const out: { idx: number; tMin: number; distKm: number }[] = [];
    if (!intervalMin || !minutes) return out;
    for (let i = 1; i <= 60; i++) {
      const t = i * intervalMin;
      if (t > minutes) break;
      const dist =
        modality === 'Running' ? t / paceMinPerKm : (speedKmh / 60) * t;
      out.push({ idx: i, tMin: t, distKm: Math.round(dist * 100) / 100 });
    }
    return out;
  }, [intervalMin, minutes, modality, paceMinPerKm, speedKmh]);

  /* ---------- Tolerancia ---------- */
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

  const frFrac = choProduct.cho ? choProduct.fructosa / choProduct.cho : 0;
  const sospechas: string[] = [];
  if (sxInf >= 3 && frFrac >= 0.3)
    sospechas.push('Posible malabsorción de fructosa');
  if (sxSup >= 3 && choProduct.maltodextrina > 0)
    sospechas.push('Osmolaridad alta / maltodextrina');
  if (sxNeuro >= 2 && choProduct.cafeina >= 100)
    sospechas.push('Sensibilidad a cafeína');

  /* ---------- Formularios para agregar productos ---------- */
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
    if (!newCHO.nombre || !newCHO.cho) {
      alert('Nombre y CHO son obligatorios');
      return;
    }
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
    if (!newDrink.nombre || !newDrink.mlPorPorcion) {
      alert('Nombre y ml/porción son obligatorios');
      return;
    }
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
    if (!newElec.nombre || !newElec.sodioPorUnidad) {
      alert('Nombre y mg Na/unidad obligatorios');
      return;
    }
    setElectrolytes((prev) => [...prev, { ...newElec }]);
    setElectrolyteName(newElec.nombre);
    setNewElec({ nombre: '', tipo: 'Capsula', sodioPorUnidad: 200 });
  };

  /* ---------- UI ---------- */
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">App CHO & Hidratación – MVP</h1>

      {/* PERFIL / NIVEL */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="p-4 rounded-2xl shadow bg-white">
          <h2 className="text-lg font-semibold mb-3">Perfil del atleta</h2>
          <div className="grid grid-cols-2 gap-3 items-end">
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
                placeholder="hh:mm"
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
                  onChange={(e) =>
                    setPaceMinPerKm(parseFloat(e.target.value || '0'))
                  }
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
                  onChange={(e) =>
                    setSpeedKmh(parseFloat(e.target.value || '0'))
                  }
                />
              </label>
            )}
            <label className="col-span-1">
              Temperatura (°C)
              <input
                type="number"
                className="w-full border p-2 rounded"
                value={temperature}
                onChange={(e) =>
                  setTemperature(parseFloat(e.target.value || '0'))
                }
              />
            </label>
            <label className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={gutTraining}
                onChange={(e) => setGutTraining(e.target.checked)}
              />
              Entrenamiento intestinal realizado
            </label>
          </div>
          <div className="mt-4 text-sm bg-gray-50 p-3 rounded">
            <div>
              <span className="font-semibold">Duración:</span>{' '}
              {hours.toFixed(2)} h ({durCat})
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl shadow bg-white">
          <h2 className="text-lg font-semibold mb-3">Cuestionario de nivel</h2>
          <div className="grid grid-cols-2 gap-3 items-end text-sm">
            <label>
              Semanas entrenando (&gt;3/sem)
              <select
                className="w-full border p-2 rounded"
                value={qWeeks}
                onChange={(e) => setQWeeks(parseInt(e.target.value))}
              >
                <option value={0}>{'<6 (0)'}</option>
                <option value={1}>{'6–12 (1)'}</option>
                <option value={2}>{'>12 (2)'}</option>
              </select>
            </label>
            <label>
              Sesiones/semana
              <select
                className="w-full border p-2 rounded"
                value={qSessions}
                onChange={(e) => setQSess(parseInt(e.target.value))}
              >
                <option value={0}>{'≤2 (0)'}</option>
                <option value={1}>{'3–4 (1)'}</option>
                <option value={2}>{'≥5 (2)'}</option>
              </select>
            </label>
            <label>
              Horas/semana
              <select
                className="w-full border p-2 rounded"
                value={qHours}
                onChange={(e) => setQHours(parseInt(e.target.value))}
              >
                <option value={0}>{'<3 (0)'}</option>
                <option value={1}>{'3–6 (1)'}</option>
                <option value={2}>{'>6 (2)'}</option>
              </select>
            </label>
            <label>
              Fondos (&gt;2 h) último año
              <select
                className="w-full border p-2 rounded"
                value={qLongs}
                onChange={(e) => setQLongs(parseInt(e.target.value))}
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
                onChange={(e) => setQGut(parseInt(e.target.value))}
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
                onChange={(e) => setQGI(parseInt(e.target.value))}
              >
                <option value={0}>Frecuente (0)</option>
                <option value={1}>Ocasional (1)</option>
                <option value={2}>Raro (2)</option>
              </select>
            </label>
          </div>
          <div className="mt-3 text-sm bg-gray-50 p-3 rounded">
            <div>
              <span className="font-semibold">Puntaje:</span> {score}
            </div>
            <div>
              <span className="font-semibold">Nivel:</span> {level}
            </div>
            <div>
              <span className="font-semibold">Rango sugerido CHO:</span>{' '}
              {range?.label ?? '—'} g/h
            </div>
            <div>
              <span className="font-semibold">CHO objetivo:</span>{' '}
              {choTarget ? `${choTarget.toFixed(0)} g/h` : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* HIDRATACIÓN por sudor */}
      <section className="p-4 rounded-2xl shadow bg-white">
        <h2 className="text-lg font-semibold mb-3">
          Hidratación (tasa de sudoración y sodio)
        </h2>
        <div className="grid md:grid-cols-4 gap-3 items-end text-sm">
          <label>
            Tasa de sudoración (L/h)
            <input
              type="number"
              step="0.1"
              className="w-full border p-2 rounded"
              value={sweatRateLh}
              onChange={(e) =>
                setSweatRateLh(parseFloat(e.target.value || '0'))
              }
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
          <div className="bg-gray-50 p-2 rounded">
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
                <option key={d.nombre} value={d.nombre}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2">
            Cápsula/electrolito (opcional para cubrir déficit de Na)
            <select
              className="w-full border p-2 rounded"
              value={electrolyteName}
              onChange={(e) => setElectrolyteName(e.target.value)}
            >
              {electrolytes.map((el) => (
                <option key={el.nombre} value={el.nombre}>
                  {el.nombre}
                </option>
              ))}
            </select>
          </label>

          <div className="col-span-4 grid md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded">
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
        </div>
      </section>

      {/* PLAN DE CARRERA (CHO neto) */}
      <section className="p-4 rounded-2xl shadow bg-white">
        <h2 className="text-lg font-semibold mb-3">
          Plan de competencia (CHO neto para gel/barrita)
        </h2>
        <div className="grid md:grid-cols-4 gap-3 items-end text-sm">
          <label className="col-span-2">
            Producto CHO (gel/barrita)
            <select
              className="w-full border p-2 rounded"
              value={choProductName}
              onChange={(e) => setChoProductName(e.target.value)}
            >
              {choProducts.map((p) => (
                <option key={p.nombre} value={p.nombre}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="bg-gray-50 p-2 rounded">
            CHO objetivo total: <b>{(hours * choTarget).toFixed(0)}</b> g
          </div>
          <div className="bg-gray-50 p-2 rounded">
            CHO bebida: <b>{(hours * drinkCHOgh).toFixed(0)}</b> g
          </div>
          <div className="bg-gray-50 p-2 rounded col-span-2">
            CHO a cubrir (neto): <b>{(hours * choTargetNet).toFixed(0)}</b> g
          </div>
          <div className="bg-gray-50 p-2 rounded">
            Intervalo: <b>{intervalMin || '—'}</b> min
          </div>
          <div className="bg-gray-50 p-2 rounded">
            Intervalo: <b>{intervalKm || '—'}</b> km
          </div>
          <div className="bg-gray-50 p-2 rounded">
            Unidades totales (≈):{' '}
            <b>
              {choProduct.cho
                ? Math.ceil((hours * choTargetNet) / choProduct.cho)
                : '—'}
            </b>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                {[
                  '#',
                  'Tiempo (min)',
                  'Distancia acumulada (km)',
                  'Producto',
                  'Unidades',
                  'CHO acumulado (g)',
                ].map((h) => (
                  <th key={h} className="p-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr key={i} className="border-b">
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
        <h2 className="text-lg font-semibold mb-3">
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
            <label key={key} className="flex flex-col">
              {label} (0–3)
              <input
                type="number"
                min={0}
                max={3}
                className="border p-2 rounded"
                value={(sx as any)[key]}
                onChange={(e) =>
                  setSx((s) => ({
                    ...s,
                    [key]: Math.max(
                      0,
                      Math.min(3, parseInt(e.target.value || '0'))
                    ),
                  }))
                }
              />
            </label>
          ))}
        </div>
        <div className="mt-3 text-sm bg-gray-50 p-3 rounded">
          <div>
            Sup: <b>{sxSup}</b> | Inf: <b>{sxInf}</b> | Neuro: <b>{sxNeuro}</b>{' '}
            | Fructosa del producto: <b>{(frFrac * 100).toFixed(0)}%</b>
          </div>
          <div className="mt-2">
            <span className="font-semibold">Sospechas: </span>
            {sospechas.length ? sospechas.join(', ') : '—'}
          </div>
          <div className="mt-1">
            <span className="font-semibold">Sugerencias:</span>
            {sospechas.includes('Posible malabsorción de fructosa')
              ? ' elija gel/bebida sin fructosa o con menor %'
              : null}
            {sospechas.includes('Osmolaridad alta / maltodextrina')
              ? ' • baje concentración (6–8%) o prefiera geles sin maltodextrina'
              : null}
            {sospechas.includes('Sensibilidad a cafeína')
              ? ' • use versión sin cafeína o reduzca dosis'
              : null}
          </div>
        </div>
      </section>

      {/* CATÁLOGO: Añadir productos */}
      <section className="p-4 rounded-2xl shadow bg-white">
        <h2 className="text-lg font-semibold mb-3">
          Catálogo de productos (añadir/editar en vivo)
        </h2>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">
            Añadir producto CHO (gel/barrita)
          </h3>
          <div className="grid md:grid-cols-6 gap-2 text-sm">
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
              onChange={(e) => setNewCHO({ ...newCHO, cho: +e.target.value })}
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="Glucosa g"
              value={newCHO.glucosa}
              onChange={(e) =>
                setNewCHO({ ...newCHO, glucosa: +e.target.value })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="Fructosa g"
              value={newCHO.fructosa}
              onChange={(e) =>
                setNewCHO({ ...newCHO, fructosa: +e.target.value })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="Maltodex g"
              value={newCHO.maltodextrina}
              onChange={(e) =>
                setNewCHO({ ...newCHO, maltodextrina: +e.target.value })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="Sacarosa g"
              value={newCHO.sacarosa}
              onChange={(e) =>
                setNewCHO({ ...newCHO, sacarosa: +e.target.value })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="Cafeína mg"
              value={newCHO.cafeina}
              onChange={(e) =>
                setNewCHO({ ...newCHO, cafeina: +e.target.value })
              }
            />
            <button className="border p-2 rounded col-span-2" onClick={addCHO}>
              Añadir CHO
            </button>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Añadir bebida</h3>
          <div className="grid md:grid-cols-6 gap-2 text-sm">
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
                setNewDrink({ ...newDrink, mlPorPorcion: +e.target.value })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="CHO g/porción"
              value={newDrink.choPorPorcion}
              onChange={(e) =>
                setNewDrink({ ...newDrink, choPorPorcion: +e.target.value })
              }
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="Na mg/porción"
              value={newDrink.sodioPorPorcion}
              onChange={(e) =>
                setNewDrink({ ...newDrink, sodioPorPorcion: +e.target.value })
              }
            />
            <div className="col-span-2 flex items-center">
              <button className="border p-2 rounded w-full" onClick={addDrink}>
                Añadir bebida
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Añadir cápsula/electrolito</h3>
          <div className="grid md:grid-cols-6 gap-2 text-sm">
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
                setNewElec({ ...newElec, sodioPorUnidad: +e.target.value })
              }
            />
            <div className="col-span-2 flex items-center">
              <button className="border p-2 rounded w-full" onClick={addElec}>
                Añadir electrolito
              </button>
            </div>
          </div>
        </div>

        {/* Vistas rápidas de catálogos */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Catálogo CHO</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    {[
                      'Producto',
                      'Tipo',
                      'CHO',
                      'Glucosa',
                      'Fructosa',
                      'Maltodex',
                      'Sacarosa',
                      'Cafeína',
                    ].map((h) => (
                      <th key={h} className="p-2 text-left">
                        {h}
                      </th>
                    ))}
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
            <h4 className="font-semibold mb-2">Catálogo Hidratación</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    {['Bebida', 'ml/porción', 'CHO/porción', 'Na/porción'].map(
                      (h) => (
                        <th key={h} className="p-2 text-left">
                          {h}
                        </th>
                      )
                    )}
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
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    {['Electrolito', 'Na/unidad'].map((h) => (
                      <th key={h} className="p-2 text-left">
                        {h}
                      </th>
                    ))}
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

      <footer className="text-xs text-gray-500">
        MVP educativo. Ajuste rangos/umbrales según evidencia y prueba en
        entrenamiento. Este material no reemplaza consejo clínico individual.
      </footer>
    </div>
  );
}
