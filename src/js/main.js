// =====================================================
// 1. PARAMÈTRES (valeurs par défaut, modifiées ensuite par le panneau)
// =====================================================
const P = {
  circles: 4, // nombre de cercles
  ratio: 3, // chaque cercle est N fois plus petit
  k: 4, // vitesse relative
  pen: 1, // position du stylo : 0 = centre, 1 = bord
  shift: 9, // décalage par tour (degrés)
  colour: 2, // numéro de couleur dans PALETTE
  thickness: 1, // épaisseur du trait
  speed: 4, // vitesse du dessin
  wheels: true, // afficher les roues
  outside: true, // rouler à l'extérieur
  scroll: false, // tourner avec la molette
};

const PALETTE = [
  "#d9261c",
  "#00d4ff",
  "#3df08f",
  "#f8f27e",
  "#6b2d3a",
  "#2a4d9a",
  "#8db3a0",
  "rainbow",
];

let R = 200; // rayon du grand cercle
let trail; // calque invisible pour la ligne
let t = 0; // angle actuel
let turn = 0; // tours terminés
let prev = null; // point précédent du stylo
let playing = true; // dessin en cours ?

// Combien de tours pour que le dessin se referme ?
// Chaque tour tourne de "shift" degrés. Le dessin est fermé quand on a fait 360°.
// Exemple : shift = 9° → 360 / 9 = 40 tours.
// gcd (plus grand diviseur commun) sert quand 360 ne se divise pas juste (ex. shift = 7°).
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}
function totalTurns() {
  if (P.shift === 0) return 1; // pas de décalage → 1 seul tour suffit
  return 360 / gcd(P.shift, 360);
}

// Écrit un texte dans la zone d'état (READY_, RUNNING_, CLOSED_…)
function setStatus(s) {
  select("#status").html(s); // p5 : on écrit le texte dans #status
}

// =====================================================
// 2. TAILLE ET MATHÉMATIQUES
// =====================================================

// calcule R pour que toute la chaîne de cercles tienne dans le canvas
//i = 1   →  1 меньше 4?  ДА  →  делаю то, что в { }  →  i становится 2
//i = 2   →  2 меньше 4?  ДА  →  делаю то, что в { }  →  i становится 3
//i = 3   →  3 меньше 4?  ДА  →  делаю то, что в { }  →  i становится 4
//i = 4   →  4 меньше 4?  НЕТ →  СТОП

// Calcule la taille du grand cercle (R) pour que tout le dessin tienne dans l'écran.
// Les petits cercles sont collés à l'extérieur, l'un après l'autre :
// chacun allonge le dessin de sa largeur (2 / ratio^i).
// reach = longueur totale du centre jusqu'au bout de la chaîne
//       = 1 (grand cercle) + 0.667 + 0.222 + 0.074 = 1.963
// R = presque la moitié de l'écran ÷ reach → toute la chaîne tient dans l'écran.
function updateRadius() {
  let reach = 1; // jusqu'où va le dessin (en "unités" de R)
  for (let i = 1; i < P.circles; i++) {
    reach += 2 / pow(P.ratio, i); //p5: pow =puissance; chaque petit cercle ajoute 2 × son rayon
  }
  R = (min(width, height) * 0.46) / reach; // 46 % du côté le plus court, divisé par reach
}

// Calcule où se trouvent tous les cercles et le stylo pour un angle t.
// Le grand cercle est fixe au centre. Chaque petit cercle est collé au précédent
// (dehors ou dedans), il est "ratio" fois plus petit et tourne "k" fois plus vite.
// Le stylo est sur le dernier cercle. On renvoie la liste des cercles + le stylo.
function mechanism(t) {
  const centers = [{ x: 0, y: 0, r: R }]; // liste des cercles : le grand, au centre
  let angle = t; // angle du 1er petit cercle

  for (let i = 1; i < P.circles; i++) {
    // pour chaque petit cercle (i = 1, 2, 3)
    const parent = centers[i - 1]; // le cercle d'avant (on revient en arrière)
    const r = parent.r / P.ratio; // chaque nouveau cercle (rayon) est trois fois plus petit que le précédent
    const dist = P.outside ? parent.r + r : parent.r - r; // le nouveau cercle doit toucher le cercle parent
    centers.push({
      // on ajoute ce cercle à la liste :
      x: parent.x + dist * cos(angle), //   position x autour du parent
      y: parent.y + dist * sin(angle), //   position y autour du parent
      r: r, //   son rayon
      angle: angle, //   son angle
    });
    angle *= P.k; // le cercle suivant tourne k fois plus vite
  }

  const last = centers[centers.length - 1]; // le dernier cercle (le plus petit)
  const a = last.angle * P.k; // l'angle du stylo
  const penPt = {
    // position du stylo sur ce cercle
    x: last.x + last.r * P.pen * cos(a),
    y: last.y + last.r * P.pen * sin(a),
  };
  return { centers: centers, penPt: penPt }; // on renvoie les cercles + le stylo
}

// =====================================================
// 3. DESSIN DE LA LIGNE (sur le calque invisible "trail")
// =====================================================

// Donne la couleur du trait choisie dans PALETTE
function strokeColour() {
  const c = PALETTE[P.colour]; // la couleur choisie
  if (c === "rainbow")
    return `hsl(${(turn * 30 + degrees(t) * 0.3) % 360}, 85%, 65%)`; // arc-en-ciel
  return c;
}

// Tourne un point autour du centre (0, 0) d'un angle a
function rotPt(p, a) {
  return { x: p.x * cos(a) - p.y * sin(a), y: p.x * sin(a) + p.y * cos(a) };
}

// Trace un petit bout de ligne entre le point a et le point b
function segment(a, b) {
  trail.stroke(strokeColour()); // couleur du trait
  trail.strokeWeight(P.thickness); // épaisseur du trait
  trail.line(
    a.x + width / 2,
    a.y + height / 2, // + width/2, + height/2 = centre de l'écran
    b.x + width / 2,
    b.y + height / 2,
  );
}

// advance(dt) : un petit pas du dessin
//
//   tourner un tout petit peu (t += dt)
//           ↓
//   un tour complet ?  ── oui ──→  tour suivant (turn + 1)
//           ↓                        ↓
//           ↓                 tous les tours faits ?  ── oui ──→  fin
//           ↓                        ↓ non
//   où est le stylo maintenant ?  ←──┘
//   (tourné de shift × turn degrés)
//           ↓
//   tracer une ligne de « avant » à « maintenant »
//           ↓
//   retenir « maintenant »
//
function advance(dt) {
  t += dt; // le mécanisme tourne un peu
  if (t >= TWO_PI) {
    // un tour complet est fini ?
    t -= TWO_PI; // on recommence l'angle
    turn++; // un tour de plus
    prev = null; // on ne relie pas la fin d'un tour au début du suivant
    if (turn >= totalTurns()) {
      // tous les tours sont faits ?
      t = 0;
      finish(); // → fin du dessin
      return;
    }
  }
  const pt = rotPt(mechanism(t).penPt, radians(P.shift) * turn); // stylo, tourné de shift × turn
  if (prev) segment(prev, pt); // ligne : avant → maintenant
  prev = pt; // maintenant devient "avant"
}

// Fin du dessin : on s'arrête et on l'écrit à l'écran
function finish() {
  playing = false;
  setStatus("CLOSED_");
}

// =====================================================
// 4. p5 : SETUP ET DRAW
// =====================================================

// SETUP : une seule fois au début
function setup() {
  const stage = select("#stage"); // on trouve la boîte #stage du HTML
  const w = stage.width; // sa largeur
  const h = round(w * 0.7); // hauteur = 70 % de la largeur
  createCanvas(w, h).parent("stage"); // canvas placé dans #stage
  trail = createGraphics(w, h); // calque pour la ligne
  updateRadius(); // calcule la taille des cercles
}

// DRAW : en boucle, ~60 fois par seconde
function draw() {
  background(2, 13, 15); // fond sombre, efface l'image précédente
  drawGrid(); // grille

  // --- on fait avancer le dessin ---
  if (playing && turn < totalTurns()) {
    // on dessine ET il reste des tours à faire
    // si on est en train de dessiner
    for (let s = 0; s < P.speed * 5; s++) {
      // 20 petits pas par image (speed 4 × 5) - s = 0   →  0 < 20?  OUI  →  advance(0.004)  →  s = 1
      advance(0.004); // un petit pas : t augmente de 0.004
      if (!playing) break; // si c'est fini, on sort
    }
  }
  image(trail, 0, 0); // on affiche la ligne déjà tracée

  // --- les roues ---
  push(); // on garde les réglages de dessin
  translate(width / 2, height / 2); // (0, 0) = centre de l'écran
  rotate(radians(P.shift) * turn); // les roues tournent avec le dessin
  const m = mechanism(t); // on demande où sont les cercles et le stylo

  noFill(); // cercles vides
  stroke(248, 242, 126, 150); // jaune
  for (const c of m.centers) {
    // pour chaque cercle de la liste
    circle(c.x, c.y, c.r * 2); // on le dessine (circle veut un diamètre)
  }

  noStroke(); // pas de contour
  fill(217, 38, 28); // rouge
  circle(m.penPt.x, m.penPt.y, 7); // le stylo
  pop(); // on revient aux réglages d'avant
}

// grille : une ligne tous les 50 px
function drawGrid() {
  stroke(61, 240, 143, 28); // vert transparent
  strokeWeight(1);
  for (let x = 0; x < width; x += 50) line(x, 0, x, height); // verticales
  for (let y = 0; y < height; y += 50) line(0, y, width, y); // horizontales
}

window.setup = setup;
window.draw = draw;
