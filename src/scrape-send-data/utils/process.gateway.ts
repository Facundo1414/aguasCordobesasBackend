import { UseGuards } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WsAuthGuard } from './WsAuthGuard';

@WebSocketGateway({
  cors: {
    origin: '*', 
  },
})

@UseGuards(WsAuthGuard)
export class ProcessGateway {
  @WebSocketServer()
  server: Server;

  sendLogMessage(message: string) {
    this.server.emit('log', message); // Emitimos el log a todos los clientes conectados
  }
}
