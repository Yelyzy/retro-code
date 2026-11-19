// ===== PARAMÈTRES (valeurs par défaut, modifiées ensuite par le panneau) =====
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
  symmetry: false, // symétrie ×3
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
let playing = false; // dessin en cours ?

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
    reach += 2 / Math.pow(P.ratio, i); // chaque petit cercle ajoute 2 × son rayon
  }
  R = (Math.min(width, height) * 0.46) / reach; // 46 % du côté le plus court, divisé par reach
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

// ===== SETUP : une seule fois au début =====
function setup() {
  const stage = document.getElementById("stage"); // on trouve la boîte #stage du HTML
  const w = stage.clientWidth; // sa largeur
  const h = Math.round(w * 0.7); // hauteur = 70 % de la largeur
  createCanvas(w, h).parent("stage"); // canvas placé dans #stage
  trail = createGraphics(w, h); // calque pour la ligne
}

// ===== DRAW : en boucle, ~60 fois par seconde =====
function draw() {
  background(2, 13, 15); // fond sombre, efface l'image précédente
  drawGrid(); // grille
}

// grille : une ligne tous les 50 px
function drawGrid() {
  stroke(61, 240, 143, 28); // vert transparent
  strokeWeight(1);
  for (let x = 0; x < width; x += 50) line(x, 0, x, height); // verticales
  for (let y = 0; y < height; y += 50) line(0, y, width, y); // horizontales
}
