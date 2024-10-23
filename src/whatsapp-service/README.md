# WhatsAppService

El `WhatsAppService` es un servicio de NestJS que utiliza la biblioteca `whatsapp-web.js` para interactuar con WhatsApp Web. Permite enviar mensajes y archivos PDF a través de la plataforma de WhatsApp, facilitando la comunicación automatizada con los usuarios.

## Instalación

Para instalar las dependencias necesarias, ejecuta:

```bash
npm install whatsapp-web.js qrcode

Uso
Importación del Módulo
Importa el WhatsAppService en el módulo donde lo utilizarás:

import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

@Module({
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}


Eventos
Eventos de WhatsApp
El servicio maneja varios eventos que pueden ser útiles para el seguimiento del estado de la conexión:

qr: Se dispara cuando se recibe un código QR.
ready: Indica que el cliente de WhatsApp Web está listo.
auth_failure: Indica que ha fallado la autenticación.
authenticated: Indica que la autenticación ha sido exitosa.
disconnected: Se dispara cuando el cliente de WhatsApp Web se desconecta.