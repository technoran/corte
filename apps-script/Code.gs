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
 * Columnas escritas: Fecha | Referencia | Producto | Precio | Comentario | Nombre | Contacto | Origen | Estado
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

function doPost(e) {
  try {
    var o = JSON.parse(e.postData.contents);
    var price = PRICES[o.productId];
    if (!price) return json({ error: "producto inválido" });

    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    var ref = Utilities.getUuid();
    sheet.appendRow([
      new Date(), ref, clean(o.producto), price, clean(o.comentario), clean(o.nombre), clean(o.contacto), clean(o.origen), "Pendiente de pago"
    ]);

    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty("MP_ACCESS_TOKEN");
    if (!token) return json({ ref: ref });

    var site = props.getProperty("SITE_URL") || "";
    var body = {
      items: [{ title: o.producto, quantity: 1, unit_price: price, currency_id: "ARS" }],
      external_reference: ref,
      back_urls: { success: site, failure: site, pending: site },
      auto_return: "approved"
    };
    var res = UrlFetchApp.fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + token },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    var pref = JSON.parse(res.getContentText());
    return json({ ref: ref, init_point: pref.init_point });
  } catch (err) {
    return json({ error: String(err) });
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
