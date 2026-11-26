// ----- 1. ПАРАМЕТРЫ (потом их будут менять кнопки) -----
let params = {
  circles: 4, // NUMBER OF CIRCLES — сколько всего кругов (2–5)
  scale: 3, // SCALE DOWN — каждый круг в N раз меньше предыдущего (2–6)
  k: 4, // RELATIVE SPEED — каждый круг крутится в k раз быстрее (2–6)
  pen: 100, // PEN POSITION — 0% = центр круга, 100% = край (0–150)
  turns: 6, // TURNS — через сколько оборотов рисунок замкнётся (1–20)
  speed: 5, // SPEED — скорость анимации (1–10)
  thickness: 1, // THICKNESS — толщина линии в px (1–8)
  colour: "#3ddc84", // COLOUR — цвет линии или 'rainbow'
  showWheels: true, // SHOW THE WHEELS — показывать колёса
  outside: true, // ROLL ON THE OUTSIDE — катить снаружи (false = внутри)
};

// цвета оформления
const BG = "#03100d";
const GRID = "#0d2a22";
const WHEEL = "#f8f47a";

// ----- 2. СОСТОЯНИЕ -----
let trail; // отдельный слой для рисунка (его не стираем)
let exportLayer;
let playing = false; // идёт ли анимация
let t = 0; // "время": один оборот = TWO_PI, весь рисунок = TWO_PI * turns
let dt; // маленький шаг времени
let lastPen = null; // предыдущая точка пера
let scrollMode = false;

function setup() {
  const stage = document.getElementById("stage");
  const canvas = createCanvas(max(stage.clientWidth, 1), max(stage.clientHeight, 1));
  canvas.parent(stage);
  setupPanel(); // подключаем кнопки панели
  restart(false);
}

function draw() {
  background(BG);
  drawGrid();

  if (playing) {
    advance(stepsPerFrame());
  }

  image(trail, 0, 0);
  if (params.showWheels) drawWheels(mechanism(t));
}

function drawGrid() {
  stroke(GRID);
  strokeWeight(1);
  for (let x = 0; x < width; x += 30) line(x, 0, x, height);
  for (let y = 0; y < height; y += 30) line(0, y, width, y);
}

// =====================================================
//  МЕХАНИЗМ: где круги и перо в момент времени "time"
// =====================================================
function mechanism(time) {
  let list = [];
  let r = bigRadius();
  let x = width / 2;
  let y = height / 2;
  let speed = 1;

  list.push({ x: x, y: y, r: r }); // большой круг стоит на месте

  for (let i = 1; i < params.circles; i++) {
    let rChild = r / params.scale;
    let angle = time * speed + PI; // PI = начинаем слева

    // расстояние между центрами: снаружи r + rChild, внутри r - rChild
    let d = params.outside ? r + rChild : r - rChild;
    x = x + d * cos(angle);
    y = y + d * sin(angle);

    list.push({ x: x, y: y, r: rChild });
    r = rChild;
    speed = speed * -params.k; // следующий — в k раз быстрее и в обратную сторону
  }

  // перо: точка на последнем круге
  let penAngle = time * speed + PI;
  let penDist = (r * params.pen) / 100;
  let pen = {
    x: x + penDist * cos(penAngle),
    y: y + penDist * sin(penAngle),
  };

  // ПОВОРОТ "БУМАГИ": за весь рисунок — ровно один полный круг
  let rot = time / params.turns;
  for (let c of list) rotateAround(c, rot);
  rotateAround(pen, rot);

  // поворачивает точку p вокруг центра холста на угол a
  function rotateAround(p, a) {
    let dx = p.x - width / 2;
    let dy = p.y - height / 2;
    p.x = width / 2 + dx * cos(a) - dy * sin(a);
    p.y = height / 2 + dx * sin(a) + dy * cos(a);
  }

  return { circles: list, pen: pen };
}

// =====================================================
//  шаг 5
// =====================================================

// радиус большого круга — чтобы рисунок влез в холст
function bigRadius() {
  let sum = 0;
  for (let i = 1; i < params.circles; i++) {
    sum += 1 / pow(params.scale, i);
  }
  let room = (min(width, height) / 2) * 0.9;
  return params.outside ? room / (1 + 2 * sum) : room;
}

function drawWheels(m) {
  noFill();
  stroke(WHEEL);
  strokeWeight(1);
  for (let c of m.circles) {
    circle(c.x, c.y, c.r * 2);
  }
  let last = m.circles[m.circles.length - 1];
  line(last.x, last.y, m.pen.x, m.pen.y); // "палочка" до пера
  fill(WHEEL);
  noStroke();
  circle(m.pen.x, m.pen.y, 6); // само перо
}

// =====================================================
//  Шаг 6:РИСОВАНИЕ СЛЕДА
// =====================================================
function advance(steps) {
  for (let i = 0; i < steps; i++) {
    t = min(t + dt, TWO_PI * params.turns);
    let pen = mechanism(t).pen;

    if (lastPen) {
      trail.stroke(currentColour());
      trail.strokeWeight(params.thickness);
      trail.line(lastPen.x, lastPen.y, pen.x, pen.y);
    }
    lastPen = pen;
    if (t >= TWO_PI * params.turns) {
      setPlaying(false, "CLOSED_");
      return;
    }
  }
}

function currentColour() {
  if (params.colour === "rainbow") {
    let hue = floor((t / (TWO_PI * params.turns)) * 360);
    return color("hsl(" + hue + ", 100%, 50%)");
  }
  return params.colour;
}

// самый быстрый круг крутится в k^(кругов-1) раз быстрее первого,
// поэтому шаг берём маленьким, чтобы линия была гладкой
function computeStep() {
  dt = 0.03 / pow(params.k, params.circles - 1);
}

// сколько шагов делать за кадр, чтобы рисунок занял нужное время
function stepsPerFrame() {
  let totalSteps = (TWO_PI * params.turns) / dt;
  let seconds = 22 - params.speed * 2 + params.turns * 2;
  return ceil(totalSteps / (seconds * 60));
}

// =====================================================
//  УПРАВЛЕНИЕ
// =====================================================
function restart(shouldPlay = false) {
  if (trail) trail.remove();
  if (exportLayer) exportLayer.remove();
  trail = createGraphics(width, height);
  exportLayer = createGraphics(width, height);
  t = 0;
  lastPen = null;
  computeStep();
  setPlaying(shouldPlay);
}

function windowResized() {
  const stage = document.getElementById("stage");
  if (!stage || stage.clientWidth === 0 || stage.clientHeight === 0) return;
  resizeCanvas(stage.clientWidth, stage.clientHeight);
  restart(false);
}

// =====================================================
//  ПАНЕЛЬ И КНОПКИ
// =====================================================

const CONTROLS = [
  { id: "circles", key: "circles", min: 2, max: 5, step: 1, text: (v) => v, redraw: true },
  { id: "ratio", key: "scale", min: 2, max: 6, step: 0.5, text: (v) => "x " + v, redraw: true },
  { id: "speed-k", key: "k", min: 2, max: 6, step: 1, text: (v) => v, redraw: true },
  { id: "pen", key: "pen", min: 0, max: 150, step: 10, text: (v) => v + "%", redraw: true },
  { id: "turns", key: "turns", min: 1, max: 20, step: 1, text: (v) => v, redraw: true },
  { id: "speed", key: "speed", min: 1, max: 10, step: 1, text: (v) => v, redraw: false },
  { id: "thickness", key: "thickness", min: 1, max: 8, step: 1, text: (v) => v + " px", redraw: false },
];

// цвета квадратов (те же, что в input-button.scss)
const COLOURS = {
  red: "#d4260e",
  blue: "#02d8fc",
  green: "#43ec8e",
  yellow: "#f8fc81",
  wine: "#722f37",
  navy: "#2e5090",
  sage: "#85b09a",
  rainbow: "rainbow",
};

function setupPanel() {
  for (const c of CONTROLS) {
    const input = document.getElementById(c.id);
    const row = input.parentElement;

    const change = (direction) => {
      const next = constrain(params[c.key] + direction * c.step, c.min, c.max);
      if (next === params[c.key]) return; // уже на краю
      params[c.key] = next;
      input.value = c.text(next);
      if (c.redraw) restart(false);
    };

    input.value = c.text(params[c.key]);
    row.querySelector(".arrow-left").addEventListener("click", () => change(-1));
    row.querySelector(".arrow-right").addEventListener("click", () => change(1));
  }

  for (const radio of document.querySelectorAll('input[name="colour"]')) {
    if (radio.checked) params.colour = COLOURS[radio.value];
    radio.addEventListener("change", () => {
      params.colour = COLOURS[radio.value];
    });
  }

  createCheckbox("SHOW THE WHEELS", params.showWheels, (value) => {
    params.showWheels = value;
  });
  createCheckbox("ROLL ON THE OUTSIDE", params.outside, (value) => {
    params.outside = value;
    restart(false);
  });
  createCheckbox("TURN WITH THE SCROLL WHEEL", scrollMode, (value) => {
    scrollMode = value;
    setPlaying(false);
    document.getElementById("play").disabled = value;
    setStatus(value ? "SCROLL_" : "READY_");
  });

  document.getElementById("play").addEventListener("click", togglePlay);
  document.getElementById("restart").addEventListener("click", () => restart(false));
  document.getElementById("export").addEventListener("click", exportImage);
}

function createCheckbox(label, initialValue, onChange) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "check";
  item.setAttribute("aria-pressed", String(initialValue));

  const box = document.createElement("span");
  box.className = "box";
  box.textContent = initialValue ? "✓" : "";
  const text = document.createElement("span");
  text.textContent = label;
  item.append(box, text);
  document.getElementById("checks").append(item);

  let value = initialValue;
  item.addEventListener("click", () => {
    value = !value;
    box.textContent = value ? "✓" : "";
    item.classList.toggle("on", value);
    item.setAttribute("aria-pressed", String(value));
    onChange(value);
  });
  item.classList.toggle("on", value);
}

function setPlaying(value, status) {
  playing = value && !scrollMode;
  document.getElementById("play").textContent = playing ? "PAUSE" : "PLAY";
  if (status) {
    setStatus(status);
  } else if (playing) {
    setStatus("RUNNING_");
  } else if (t >= TWO_PI * params.turns) {
    setStatus("CLOSED_");
  } else {
    setStatus(scrollMode ? "SCROLL_" : "READY_");
  }
}

function setStatus(value) {
  document.getElementById("status").textContent = value;
}

function togglePlay() {
  if (scrollMode) return;
  if (t >= TWO_PI * params.turns) restart(false);
  setPlaying(!playing);
}

function exportImage() {
  exportLayer.background(BG);
  exportLayer.image(trail, 0, 0);
  saveCanvas(exportLayer, "spirograph", "png");
}

function mouseWheel(event) {
  const overCanvas = mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
  if (!scrollMode || !overCanvas) return;
  if (t >= TWO_PI * params.turns) restart(false);
  advance(ceil((abs(event.delta) / 30) * stepsPerFrame()));
  return false;
}

// type="module" прячет функции внутри файла — отдаём их p5 через window
window.setup = setup;
window.draw = draw;
window.windowResized = windowResized;
window.mouseWheel = mouseWheel;
