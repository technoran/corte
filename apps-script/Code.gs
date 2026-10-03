/**
 * Google Apps Script (Web App) — guarda el pedido en la planilla y crea el checkout de Mercado Pago.
 *
 * Instalación:
 * 1. Abrí la planilla > Extensiones > Apps Script y pegá este código.
 * 2. Configuración del proyecto > Propiedades de la secuencia de comandos:
 *      MP_ACCESS_TOKEN = tu Access Token de Mercado Pago (credenciales de producción)
 *      SITE_URL        = URL pública del sitio (para volver después del pago)
 *      OWNER_EMAIL     = elfeto17@gmail.com (opcional; por defecto tu cuenta)
 *    Al confirmarse el pago, Mercado Pago avisa por webhook (notification_url = URL de esta Web App):
 *    se marca "Confirmado" en la planilla y se envían los mails con el PDF al cliente y al dueño.
 *    Al actualizar el código hay que volver a implementar (nueva versión) y autorizar los permisos de Gmail/Drive.
 * 3. Implementar > Nueva implementación > Aplicación web
 *      Ejecutar como: yo  |  Acceso: cualquier persona
 * 4. Copiá la URL en js/config.js (sheetEndpoint).
 *
 * Columnas escritas: Fecha | Referencia | Producto | Precio | Comentario | Nombre | Contacto | Origen | Estado | Envío | Entrega | Email
 * El token nunca se expone en el navegador. Los precios se validan acá, no en el cliente.
 */
var SHEET_ID = "1WN7AknAm5HCTtFsfVUYPphvtqiryJsTkZvSwQ1OMTGI";

// Mantener sincronizado con js/config.js
var PRICES = {
  "mate-grabado": 1000,
  "virola": 1000,
  "cadenita": 1000,
  "cuadro-cortado": 10000,
  "cartel-nombre": 1000,
  "posavasos": 1000
};

// Envíos: mantener sincronizado con window.SHIPPING en js/config.js
var FREE_FROM = 0; // envío gratis desde este monto; 0 = desactivado
var ZONE_PRICE = { noa: 1000, nea: 1000, centro: 1000, cuyo: 1000, buenosaires: 1000, patagonia: 1000 };
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
    var p = (e && e.parameter) || {};
    var body = {};
    try { body = JSON.parse((e.postData && e.postData.contents) || "{}"); } catch (x) {}
    // Notificación (webhook) de Mercado Pago
    var type = p.type || p.topic || body.type || body.topic;
    var payId = p["data.id"] || p.id || (body.data && body.data.id) || "";
    if (type === "payment" && payId) return json(handlePayment(String(payId)));
    if (body.productId) return json(createOrder(body));
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: String(err) });
  }
}

// Verifica el pago consultando a Mercado Pago (no se confía en el contenido del webhook)
function handlePayment(payId) {
  var token = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
  if (!token) return { error: "sin token" };
  var res = UrlFetchApp.fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(payId), {
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true
  });
  var pay = JSON.parse(res.getContentText());
  if (pay.status !== "approved" || !pay.external_reference) return { ok: true, status: pay.status };
  return confirmOrder(pay.external_reference, pay);
}

function confirmOrder(ref, pay) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][1]) !== ref) continue;
      if (rows[i][8] === "Confirmado") return { ok: true, already: true };
      sheet.getRange(i + 1, 9).setValue("Confirmado");
      SpreadsheetApp.flush();
      var order = {
        fecha: rows[i][0], ref: ref, producto: rows[i][2], precio: Number(rows[i][3]) || 0,
        comentario: rows[i][4], nombre: rows[i][5], contacto: rows[i][6], origen: rows[i][7],
        envio: Number(rows[i][9]) || 0, entrega: rows[i][10], email: String(rows[i][11] || ""),
        pagoId: pay && pay.id ? String(pay.id) : "",
        payerEmail: pay && pay.payer && pay.payer.email ? pay.payer.email : ""
      };
      sendConfirmationEmails(order);
      return { ok: true };
    }
    return { error: "pedido no encontrado" };
  } finally {
    lock.releaseLock();
  }
}

var BRAND = "TU MUNDO GRABADO";

function sendConfirmationEmails(o) {
  var props = PropertiesService.getScriptProperties();
  var owner = (props.getProperty("OWNER_EMAIL") || Session.getEffectiveUser().getEmail()).trim();
  var pdf = buildReceiptPdf(o);
  var emailRe = /[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/;
  var m = String(o.email || "").match(emailRe) || String(o.payerEmail || "").match(emailRe);
  var client = m ? m[0] : "";
  var num = o.ref.slice(0, 8).toUpperCase();

  if (client) {
    try {
      MailApp.sendEmail({
        to: client,
        subject: "Compra confirmada #" + num + " - " + BRAND,
        htmlBody: emailHtml("¡Gracias por tu compra, " + esc(o.nombre) + "!", "Tu compra fue confirmada. Adjuntamos el comprobante con todos los detalles. Pronto nos pondremos en contacto para coordinar la entrega.", o),
        attachments: [pdf],
        name: BRAND
      });
    } catch (err) { console.error("Mail cliente: " + err); }
  }
  if (owner) {
    try {
      MailApp.sendEmail({
        to: owner,
        subject: "Nueva compra confirmada #" + num + " - " + o.nombre,
        htmlBody: emailHtml("Nueva compra confirmada", "Se acreditó el pago de un pedido. Comprobante adjunto.", o),
        attachments: [pdf],
        name: BRAND
      });
    } catch (err) { console.error("Mail dueño: " + err); }
  }
}

function money(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }
function esc(s) {
  return String(s == null ? "" : s).replace(/^'/, "").replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

function receiptRows(o) {
  var fecha = Utilities.formatDate(new Date(o.fecha), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  return [
    ["Nº de pedido", o.ref.slice(0, 8).toUpperCase()],
    ["Fecha", fecha],
    ["Cliente", o.nombre],
    ["Teléfono", o.contacto || "-"],
    ["Email", o.email || o.payerEmail || "-"],
    ["Entrega", o.entrega],
    ["Producto", o.producto],
    ["Detalle / Comentario", o.comentario || "-"],
    ["ID de pago", o.pagoId || "-"]
  ];
}

function emailHtml(title, intro, o) {
  var rows = receiptRows(o).map(function (r) {
    return '<tr><td style="padding:6px 10px;color:#7a5a3a"><b>' + r[0] + '</b></td><td style="padding:6px 10px">' + esc(r[1]) + "</td></tr>";
  }).join("");
  return '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e6d5bf;border-radius:10px;overflow:hidden">' +
    '<div style="background:#3b2a1a;color:#f3d9a8;padding:20px;text-align:center;font-size:22px;letter-spacing:3px"><b>' + BRAND + "</b></div>" +
    '<div style="padding:20px"><h2 style="margin-top:0;color:#3b2a1a">' + title + "</h2><p>" + intro + "</p>" +
    '<table style="width:100%;border-collapse:collapse;background:#faf5ec">' + rows + "</table>" +
    '<p style="text-align:right;font-size:18px"><b>Total: ' + money(o.precio + o.envio) + "</b></p></div></div>";
}

function buildReceiptPdf(o) {
  var total = o.precio + o.envio;
  var rows = receiptRows(o).map(function (r) {
    return '<tr><td style="padding:8px 12px;width:32%;color:#8a6a43;border-bottom:1px solid #eadcc6"><b>' + r[0] +
      '</b></td><td style="padding:8px 12px;border-bottom:1px solid #eadcc6">' + esc(r[1]) + "</td></tr>";
  }).join("");
  var html = '<html><body style="font-family:Arial,sans-serif;color:#3b2a1a;margin:0">' +
    '<table style="width:100%;background:#3b2a1a"><tr><td style="padding:28px;text-align:center">' +
    '<div style="color:#f3d9a8;font-size:30px;letter-spacing:5px"><b>' + BRAND + '</b></div>' +
    '<div style="color:#d9b97c;font-size:12px;letter-spacing:3px">CORTE Y GRABADO ARTESANAL</div></td></tr></table>' +
    '<table style="width:100%"><tr><td style="padding:22px 28px 6px"><div style="font-size:22px"><b>Comprobante de compra</b></div>' +
    '<div style="color:#2e7d32;font-size:14px"><b>&#10004; PAGO CONFIRMADO</b></div></td></tr></table>' +
    '<div style="padding:0 28px"><table style="width:100%;border-collapse:collapse;background:#faf5ec;border:1px solid #eadcc6">' + rows + "</table>" +
    '<table style="width:100%;margin-top:18px;border-collapse:collapse">' +
    '<tr><td style="padding:6px 12px;text-align:right">Producto</td><td style="padding:6px 12px;width:25%;text-align:right">' + money(o.precio) + "</td></tr>" +
    '<tr><td style="padding:6px 12px;text-align:right">Envío</td><td style="padding:6px 12px;text-align:right">' + (o.envio ? money(o.envio) : "Sin cargo") + "</td></tr>" +
    '<tr><td style="padding:12px;text-align:right;background:#3b2a1a;color:#f3d9a8;font-size:18px"><b>TOTAL</b></td>' +
    '<td style="padding:12px;text-align:right;background:#3b2a1a;color:#f3d9a8;font-size:18px"><b>' + money(total) + "</b></td></tr></table>" +
    '<p style="text-align:center;color:#8a6a43;margin-top:36px">¡Gracias por elegir ' + BRAND + '! Cada pieza está hecha a mano, especialmente para vos.</p></div>' +
    "</body></html>";
  return Utilities.newBlob(html, "text/html", "comprobante.html").getAs("application/pdf")
    .setName("Comprobante-" + o.ref.slice(0, 8).toUpperCase() + ".pdf");
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
      new Date(), ref, clean(o.producto), price, clean(o.comentario), clean(o.nombre), clean(o.contacto),             clean(o.origen), "Pendiente de pago", ship, entregaTxt, clean(o.email)
    ]);

    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty("MP_ACCESS_TOKEN");
    if (!token) return { ref: ref, error: "Falta la propiedad MP_ACCESS_TOKEN en el script" };

    var site = (props.getProperty("SITE_URL") || "").trim();
    var items = [{ title: o.producto, quantity: 1, unit_price: price, currency_id: "ARS" }];
    if (ship > 0) items.push({ title: "Envío a " + e.provincia, quantity: 1, unit_price: ship, currency_id: "ARS" });
    var body = {
      items: items,
      external_reference: ref,
      notification_url: ScriptApp.getService().getUrl()
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
