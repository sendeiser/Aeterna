# Enviar Cobro a Distancia (Parcelas y Plan Seguro) — Diseño

## Intención

Poder cobrar a distancia el **mantenimiento anual de parcelas** y las **cuotas del Plan Seguro**. Hoy hace falta que el contribuyente vaya a la ventanilla. Con esto:

1. La oficina le manda al cliente, por WhatsApp, Instagram, Facebook o Gmail, el **alias**, el CBU, el monto y la **imagen del QR**.
2. Cuando el cliente transfiere, la oficina registra el pago y le **envía el recibo oficial** por el mismo canal.

Todo el trámite ocurre en **un modal aparte**, que se abre con **un botón nuevo**. El modal de ventanilla actual ("Cobrar") no cambia para quien lo usa.

## Objetivos

- Agregar un botón **"Enviar cobro"** en cada parcela de `ParcelasView` y en cada afiliado de `AfiliadosSeguroView`, en las vistas de tabla y de tarjetas mobile.
- Crear un modal nuevo, `EnviarCobroModal`, con dos pasos:
  - **Paso 1 – Pedir el pago:** muestra titular, concepto y monto (editable), alias, CBU y QR. Tiene botones WhatsApp, Instagram, Facebook y Gmail que ya traen el teléfono o el usuario del cliente, y un botón para copiar o compartir la **imagen del QR**.
  - **Paso 2 – Ya pagó:** se carga el monto recibido y el número de operación, y "Registrar pago" emite el recibo. Después aparecen los botones para **enviar el recibo** por WhatsApp, Instagram, Facebook o Gmail.
- En parcelas, el concepto pasa a ser **"Mantenimiento Anual – Parcela X"**. También se corrige "Cuatrimestral" en el cobro de ventanilla.
- En el seguro, el modal permite elegir qué cuotas cobrar. Si hay cuotas vencidas, vienen marcadas; si no, se marca la próxima cuota.

## Fuera de alcance

- AeternaXP. Se hace después en una etapa aparte. Ahí también se corrigen el alias y el CBU fijos en el código y el link del portal que no existe.
- Guardar la captura de transferencia que mande el cliente.
- Adjuntar el recibo como PDF o imagen. El recibo se envía como texto.
- Cambios en la base de datos.

## Qué no puede pasar

- Que registrar un pago desde el modal nuevo deje el saldo, las cuotas, la caja o Supabase distintos de lo que dejaría el mismo cobro hecho en ventanilla.
- Que el cobro de ventanilla actual cambie de comportamiento.

## Opciones consideradas

| Opción | Qué implica | Desventaja |
|---|---|---|
| **A. Modal nuevo independiente + lógica de cobro compartida (elegida)** | La lógica que registra el pago sale de `App.tsx` a funciones puras compartidas, y el modal de ventanilla y el nuevo usan las mismas. | Toca el código del cobro actual. Queda cubierto con tests. |
| B. "Modo remoto" dentro de `QRPaymentModal` | Es menos código. | El modal ya tiene unas 900 líneas, mezcla dos usos y no es un modal aparte. |
| C. El modal nuevo solo envía; el registro se hace en el modal de ventanilla | Es lo más rápido. | El trámite queda partido en dos ventanas. |

**La eligió el usuario (A)** porque es la única que da un modal aparte con todo el trámite adentro, sin duplicar la lógica de cobro.

## Lo que se decidió

- **El recibo lo envía la oficina al cliente** como texto, con número de recibo, titular, referencia, concepto, monto, medio de pago, número de operación y fecha.
- **El pedido de pago lleva alias, CBU y monto en texto, más la imagen del QR.** La imagen se genera con `qrcode.react`, que ya está instalada, sin dependencias nuevas.
  - En el celular se comparte con la función de compartir del navegador.
  - En la PC se copia al portapapeles para pegarla en el chat.
  - Si el navegador no permite ninguna de las dos, se descarga como PNG.
- **El link al portal web se incluye solo si la web está publicada.** Cuando corre en `localhost` o en una IP local, el mensaje lo omite para no mandar un link roto.
- **El medio de pago registrado desde este modal es siempre `transferencia_qr`.**

## Decisiones mías (revisalas)

- Las funciones compartidas `registrarCobroParcela` y `registrarCobroCuotas` van en `src/services/cobroService.ts`. Son puras: reciben el estado y devuelven la parcela o el afiliado actualizado y el `PagoRecibo`. `App.tsx` se queda con el `setState` y la sincronización con Supabase, en un solo lugar compartido por los dos modales.
- En parcelas, "Enviar cobro" aparece solo donde hoy aparece "Cobrar". Las parcelas en stand-by siguen con su propio trámite de regularización.
- El texto del recibo se arma con una función nueva, `formatReciboShareMessage`, en `paymentShareHelper.ts`. Usa los mismos canales que el pedido de pago.
- El cobro de varias cuotas pasa a enviar también el teléfono y las redes del afiliado, que hoy faltan.
- Se corrige que el cobro de cuotas en ventanilla ignore el número de recibo, el medio de pago y el monto cargados en el modal.

## Clarificación del usuario: Saldo 0 en Parcelas

- **Cuando una parcela tiene saldo $0 es porque ya pagó el mantenimiento anual ("Al Día").**
- En ese caso, al abrir "Enviar cobro":
  - El modal reconoce que la parcela está "Al Día".
  - Ofrece la opción de **Enviar Comprobante del mantenimiento anual ya cancelado**, o
  - Cobrar por adelantado el próximo período anual (monto editable por el operador).
- Cuando la parcela tiene saldo adeudado (`saldo_mantenimiento > 0`), el monto por defecto a cobrar y reclamar es exactamente ese saldo pendiente.

## Pruebas

- Tests unitarios de `registrarCobroParcela` y `registrarCobroCuotas`: saldo, estado, cuotas pagadas y datos del recibo.
- Tests de `formatReciboShareMessage` y de la regla que omite el link en `localhost`.
- Se mantienen en verde los 38 tests actuales.
- Prueba manual en el navegador: abrir el modal desde una parcela y desde un afiliado, enviar, registrar el pago y enviar el recibo.
