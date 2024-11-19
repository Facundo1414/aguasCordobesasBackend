import { UseGuards } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
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

  // Almacena los sockets por userId
  private usersSockets = new Map<string, string>();

  @SubscribeMessage('connectUser')
  handleUserConnection(@MessageBody() userId: string, @ConnectedSocket() socket: any) {
    // Almacena el socket asociado con el userId
    this.usersSockets.set(userId, socket.id);
    socket.join(userId); // Asocia el socket con el userId
  }

  sendLogMessage(userId: string, message: string) {
    const socketId = this.usersSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('log', message); // Emitir solo al socket del usuario
    }
  }
}
