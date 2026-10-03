// Configuración del sitio: editá estos valores con los datos reales del negocio.
window.CONFIG = {
  negocio: "TU Mundo Grabado",
  whatsapp: "5493854172687", // código de país + número, sin + ni espacios

  // URL de la Web App de Google Apps Script (ver apps-script/Code.gs).
  // Guarda el pedido en la planilla y crea el checkout de Mercado Pago.
  sheetEndpoint: "https://script.google.com/macros/s/AKfycby6x7EP4vPkD_n8rTVi4A7tyF66CvjbemHps8gr6zOa5Eti8MiA7S9IEZdzCK-Xubw7/exec",

  currency: "ARS",
};

// Envíos: precio fijo por zona (por pedido). Los valores son ESTIMADOS: reemplazalos con
// la cotización real del cotizador de Correo Argentino/MiCorreo (origen: tu código postal).
// Mantener sincronizado con apps-script/Code.gs (allá se valida el precio real).
window.SHIPPING = {
  retiro: { enabled: true, label: "Retiro en persona (sin costo)" },
  freeFrom: 0, // envío gratis desde este monto; 0 = desactivado
  zones: {
    noa: { label: "NOA", price: 4500 },
    nea: { label: "NEA", price: 5500 },
    centro: { label: "Centro", price: 5500 },
    cuyo: { label: "Cuyo", price: 6000 },
    buenosaires: { label: "Buenos Aires y CABA", price: 6500 },
    patagonia: { label: "Patagonia", price: 8000 },
  },
  provinces: {
    "Jujuy": "noa", "Salta": "noa", "Tucumán": "noa", "Catamarca": "noa", "La Rioja": "noa", "Santiago del Estero": "noa",
    "Chaco": "nea", "Formosa": "nea", "Corrientes": "nea", "Misiones": "nea", "Entre Ríos": "nea",
    "Córdoba": "centro", "Santa Fe": "centro",
    "Mendoza": "cuyo", "San Juan": "cuyo", "San Luis": "cuyo",
    "CABA": "buenosaires", "Buenos Aires": "buenosaires",
    "La Pampa": "patagonia", "Neuquén": "patagonia", "Río Negro": "patagonia", "Chubut": "patagonia", "Santa Cruz": "patagonia", "Tierra del Fuego": "patagonia",
  },
};

// mpLink: link de pago de Mercado Pago (opcional). Se usa como respaldo si no hay
// endpoint de Apps Script o si este falla. Ej: "https://mpago.la/xxxxxx"
window.PRODUCTS = [
  {
    id: "mate-grabado",
    icon: "image/mate.png",
    name: "Mate grabado a láser",
    short: "Tu nombre, un dibujo o una frase grabada para siempre en el mate.",
    long: "Mate de calabaza o madera con grabado láser a medida: nombre, escudo, dibujo o frase. Cada pieza se revisa a mano antes de salir del taller. Contanos en el comentario qué querés grabar.",
    price: 1000,
    mpLink: "",
  },
  {
    id: "virola",
    icon: "image/cadena1.png",
    name: "Virola personalizada",
    short: "Virolas grabadas con detalles que hacen único a tu mate.",
    long: "Virola de acero con grabado láser fino. Ideal para regalar o renovar tu mate. Indicá el diseño o texto y el diámetro del mate si lo conocés.",
    price: 1000,
    mpLink: "",
  },
  {
    id: "cadenita",
    icon: "image/corazon.png",
    name: "Cadenita con dije grabado",
    short: "Un recuerdo pequeño para llevar cerca, con nombre o fecha.",
    long: "Cadenita con dije grabado a láser: nombre, iniciales, fecha especial o un símbolo. Se entrega en una cajita lista para regalar.",
    price: 1000,
    mpLink: "",
  },
  {
    id: "cuadro-cortado",
    icon: "image/llavero1.png",
    name: "Cuadro de madera cortado",
    short: "Paisajes, mascotas o frases en capas de madera calada.",
    long: "Cuadro armado con capas de madera terciada cortada a láser, que genera profundidad y sombras suaves. Podés pedir tu mascota, tu ciudad, una frase o un símbolo familiar.",
    price: 1000,
    mpLink: "",
  },
  {
    id: "cartel-nombre",
    icon: "image/lola.png",
    name: "Cartel de madera para el hogar",
    short: "Nombre de la familia, número de casa o frase de bienvenida.",
    long: "Cartel en madera terciada cortada y grabada, con terminación natural. Elegí texto, tipografía y tamaño en el comentario.",
    price: 1000,
    mpLink: "",
  },
  {
    id: "posavasos",
    icon: "image/bombillas.png",
    name: "Set de posavasos grabados",
    short: "Cuatro posavasos de madera con el diseño que quieras.",
    long: "Set de 4 posavasos en madera terciada con grabado láser. Pueden llevar un mismo diseño o uno distinto cada uno. Perfectos para regalos.",
    price: 1000,
    mpLink: "",
  },
];

// Trabajos ya realizados para el carrusel. "image" es opcional (ruta a una foto, ej: "img/mate1.jpg");
// si está vacío se muestra el ícono sobre un fondo de color.
window.WORKS = [
  { icon: "🧉", title: "Mate con escudo familiar", note: "Grabado láser sobre calabaza", image: "image/mate.png" },
  { icon: "🖼️", title: "Cuadro Personalizado", note: "Recuerdos", image: "image/lola.png" },
  { icon: "✨", title: "Bombillas grabadas", note: "Acero grabado, detalle fino", image: "image/bombillas.png" },
  { icon: "🔗", title: "Llaveros isalas malvinas", note: "Un regalo sin igual", image: "image/malvinas.png" },
  { icon: "🏡", title: "Corazon", note: "Tu familia", image: "image/corazon.png" },
  { icon: "☕", title: "LLaveros", note: "Graba lo que quieras", image: "image/llavero.png" },
];
