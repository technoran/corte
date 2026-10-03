/**
 * Google Apps Script (Web App) — guarda el pedido en la planilla y crea el checkout de Mercado Pago.
 *
 * Instalación:
 * 1. Abrí la planilla > Extensiones > Apps Script y pegá este código.
 * 2. Configuración del proyecto > Propiedades de la secuencia de comandos:
 *      MP_ACCESS_TOKEN = tu Access Token de Mercado Pago (credenciales de producción)
 *      SITE_URL        = URL pública del sitio (para volver después del pago)
 * 3. Implementar > Nueva implementación > Aplicación web
 *      Ejecutar como: yo  |  Acceso: cualquier persona
 * 4. Copiá la URL en js/config.js (sheetEndpoint).
 *
 * Columnas escritas: Fecha | Referencia | Producto | Precio | Comentario | Nombre | Contacto | Origen | Estado | Envío | Entrega
 * El token nunca se expone en el navegador. Los precios se validan acá, no en el cliente.
 */
var SHEET_ID = "1WN7AknAm5HCTtFsfVUYPphvtqiryJsTkZvSwQ1OMTGI";

// Mantener sincronizado con js/config.js
var PRICES = {
  "mate-grabado": 18500,
  "virola": 9800,
  "cadenita": 7500,
  "cuadro-cortado": 32000,
  "cartel-nombre": 14500,
  "posavasos": 11200
};

// Envíos: mantener sincronizado con window.SHIPPING en js/config.js
var FREE_FROM = 0; // envío gratis desde este monto; 0 = desactivado
var ZONE_PRICE = { noa: 4500, nea: 5500, centro: 5500, cuyo: 6000, buenosaires: 6500, patagonia: 8000 };
var PROVINCE_ZONE = {
  "Jujuy": "noa", "Salta": "noa", "Tucumán": "noa", "Catamarca": "noa", "La Rioja": "noa", "Santiago del Estero": "noa",
  "Chaco": "nea", "Formosa": "nea", "Corrientes": "nea", "Misiones": "nea", "Entre Ríos": "nea",
  "Córdoba": "centro", "Santa Fe": "centro",
  "Mendoza": "cuyo", "San Juan": "cuyo", "San Luis": "cuyo",
  "CABA": "buenosaires", "Buenos Aires": "buenosaires",
  "La Pampa": "patagonia", "Neuquén": "patagonia", "Río Negro": "patagonia", "Chubut": "patagonia", "Santa Cruz": "patagonia", "Tierra del Fuego": "patagonia"
};

// El sitio llama por GET con JSONP (?d=<pedido JSON>&callback=fn) para evitar problemas de CORS
function doGet(e) {
  var p = (e && e.parameter) || {};
  var result;
  try {
    result = createOrder(JSON.parse(p.d || "{}"));
  } catch (err) {
    result = { error: String(err) };
  }
  var cb = p.callback;
  if (cb && /^[A-Za-z_$][\w$.]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + "(" + JSON.stringify(result) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json(result);
}

function doPost(e) {
  try {
    return json(createOrder(JSON.parse(e.postData.contents)));
  } catch (err) {
    return json({ error: String(err) });
  }
}

function createOrder(o) {
  try {
    var price = PRICES[o.productId];
    if (!price) return { error: "producto inválido" };

    var ship = 0, entregaTxt = "Retiro en persona";
    var e = o.entrega || {};
    if (e.tipo === "envio") {
      var zone = PROVINCE_ZONE[e.provincia];
      if (!zone) return { error: "provincia inválida" };
      ship = FREE_FROM && price >= FREE_FROM ? 0 : ZONE_PRICE[zone];
      entregaTxt = clean([e.direccion, e.localidad, "CP " + e.cp, e.provincia].join(", "));
    }

    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    var ref = Utilities.getUuid();
    sheet.appendRow([
      new Date(), ref, clean(o.producto), price, clean(o.comentario), clean(o.nombre), clean(o.contacto),       clean(o.origen), "Pendiente de pago", ship, entregaTxt
    ]);

    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty("MP_ACCESS_TOKEN");
    if (!token) return { ref: ref, error: "Falta la propiedad MP_ACCESS_TOKEN en el script" };

    var site = (props.getProperty("SITE_URL") || "").trim();
    var items = [{ title: o.producto, quantity: 1, unit_price: price, currency_id: "ARS" }];
    if (ship > 0) items.push({ title: "Envío a " + e.provincia, quantity: 1, unit_price: ship, currency_id: "ARS" });
    var body = {
      items: items,
      external_reference: ref
    };
    // auto_return exige back_urls https válidas; sin ellas Mercado Pago rechaza la preferencia
    if (/^https:\/\//.test(site)) {
      body.back_urls = { success: site, failure: site, pending: site };
      body.auto_return = "approved";
    }
    var res = UrlFetchApp.fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + token },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    var pref = JSON.parse(res.getContentText());
    // Con credenciales de prueba el link viene en sandbox_init_point
    var url = token.indexOf("TEST-") === 0 ? (pref.sandbox_init_point || pref.init_point) : (pref.init_point || pref.sandbox_init_point);
    if (!url) {
      console.error("Mercado Pago respondió: " + res.getContentText());
      return { ref: ref, error: "Mercado Pago: " + (pref.message || res.getContentText()) };
    }
    return { ref: ref, init_point: url };
  } catch (err) {
    return { error: String(err) };
  }
}

// Evita que un texto empiece con "=" y se interprete como fórmula en la planilla
function clean(v) {
  v = String(v || "").slice(0, 1000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
