// ----- 1. ПАРАМЕТРЫ (потом их будут менять кнопки) -----
let params = {
  circles: 3, // NUMBER OF CIRCLES — сколько всего кругов (2–5)
  scale: 3, // SCALE DOWN — каждый круг в N раз меньше предыдущего (2–6)
  k: 5, // RELATIVE SPEED — каждый круг крутится в k раз быстрее (2–6)
  pen: 100, // PEN POSITION — 0% = центр круга, 100% = край (0–150)
  turns: 10, // TURNS — через сколько оборотов рисунок замкнётся (1–20)
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
let playing = true; // идёт ли анимация
let t = 0; // "время": один оборот = TWO_PI, весь рисунок = TWO_PI * turns
let dt; // маленький шаг времени
let lastPen = null; // предыдущая точка пера

function setup() {
  createCanvas(windowWidth, windowHeight);
  restart();
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

  //Шаг 8: ПОВОРОТ "БУМАГИ": за весь рисунок — ровно один полный круг
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
    if (t >= TWO_PI * params.turns) {
      // все обороты сделаны — рисунок замкнулся
      playing = false;
      return;
    }
    t += dt;
    let pen = mechanism(t).pen;

    if (lastPen) {
      trail.stroke(currentColour());
      trail.strokeWeight(params.thickness);
      trail.line(lastPen.x, lastPen.y, pen.x, pen.y);
    }
    lastPen = pen;
  }
}

function currentColour() {
  if (params.colour === "rainbow") {
    let hue = floor((t / (TWO_PI * params.turns)) * 360);
    return color("hsb(" + hue + ", 100%, 100%)");
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
//  УПРАВЛЕНИЕ (сюда потом подключим кнопки)
// =====================================================
function restart() {
  trail = createGraphics(width, height);
  t = 0;
  lastPen = null;
  computeStep();
  playing = true;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  restart();
}

// type="module" прячет функции внутри файла — отдаём их p5 через window
window.setup = setup;
window.draw = draw;
