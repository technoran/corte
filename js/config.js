// Configuración del sitio: editá estos valores con los datos reales del negocio.
window.CONFIG = {
  negocio: "Taller Corte & Grabado",
  whatsapp: "5493854172687", // código de país + número, sin + ni espacios

  // URL de la Web App de Google Apps Script (ver apps-script/Code.gs).
  // Guarda el pedido en la planilla y crea el checkout de Mercado Pago.
  sheetEndpoint: "https://script.google.com/macros/s/AKfycby9OOtJHqBMyo05FWBv1I-KzdzgKD8B_aGelRdYzox2NfdR5vXnHJt7WRJ116cWlCsY/exec",

  currency: "ARS",
};

// mpLink: link de pago de Mercado Pago (opcional). Se usa como respaldo si no hay
// endpoint de Apps Script o si este falla. Ej: "https://mpago.la/xxxxxx"
window.PRODUCTS = [
  {
    id: "mate-grabado",
    icon: "🧉",
    name: "Mate grabado a láser",
    short: "Tu nombre, un dibujo o una frase grabada para siempre en el mate.",
    long: "Mate de calabaza o madera con grabado láser a medida: nombre, escudo, dibujo o frase. Cada pieza se revisa a mano antes de salir del taller. Contanos en el comentario qué querés grabar.",
    price: 18500,
    mpLink: "",
  },
  {
    id: "virola",
    icon: "✨",
    name: "Virola personalizada",
    short: "Virolas grabadas con detalles que hacen único a tu mate.",
    long: "Virola de acero con grabado láser fino. Ideal para regalar o renovar tu mate. Indicá el diseño o texto y el diámetro del mate si lo conocés.",
    price: 9800,
    mpLink: "",
  },
  {
    id: "cadenita",
    icon: "🔗",
    name: "Cadenita con dije grabado",
    short: "Un recuerdo pequeño para llevar cerca, con nombre o fecha.",
    long: "Cadenita con dije grabado a láser: nombre, iniciales, fecha especial o un símbolo. Se entrega en una cajita lista para regalar.",
    price: 7500,
    mpLink: "",
  },
  {
    id: "cuadro-cortado",
    icon: "🖼️",
    name: "Cuadro de madera cortado",
    short: "Paisajes, mascotas o frases en capas de madera calada.",
    long: "Cuadro armado con capas de madera terciada cortada a láser, que genera profundidad y sombras suaves. Podés pedir tu mascota, tu ciudad, una frase o un símbolo familiar.",
    price: 32000,
    mpLink: "",
  },
  {
    id: "cartel-nombre",
    icon: "🏡",
    name: "Cartel de madera para el hogar",
    short: "Nombre de la familia, número de casa o frase de bienvenida.",
    long: "Cartel en madera terciada cortada y grabada, con terminación natural. Elegí texto, tipografía y tamaño en el comentario.",
    price: 14500,
    mpLink: "",
  },
  {
    id: "posavasos",
    icon: "☕",
    name: "Set de posavasos grabados",
    short: "Cuatro posavasos de madera con el diseño que quieras.",
    long: "Set de 4 posavasos en madera terciada con grabado láser. Pueden llevar un mismo diseño o uno distinto cada uno. Perfectos para regalos.",
    price: 11200,
    mpLink: "",
  },
];

// Trabajos ya realizados para el carrusel. "image" es opcional (ruta a una foto, ej: "img/mate1.jpg");
// si está vacío se muestra el ícono sobre un fondo de color.
window.WORKS = [
  { icon: "🧉", title: "Mate con escudo familiar", note: "Grabado láser sobre calabaza", image: "" },
  { icon: "🖼️", title: "Cuadro de la costa en capas", note: "Madera terciada cortada a láser", image: "" },
  { icon: "✨", title: "Virolas con inicial", note: "Acero grabado, detalle fino", image: "" },
  { icon: "🔗", title: "Cadenita con fecha especial", note: "Un regalo que se queda cerca", image: "" },
  { icon: "🏡", title: "Cartel «Casa Fernández»", note: "Madera natural, corte y grabado", image: "" },
  { icon: "☕", title: "Posavasos con mandalas", note: "Set de cuatro, uno distinto cada uno", image: "" },
];