import { UseGuards } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WsAuthGuard } from './WsAuthGuard'; 

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization'],
  },
})
@UseGuards(WsAuthGuard) 
export class ProcessGateway {
  @WebSocketServer()
  server: Server;

  private usersSockets = new Map<string, string>();

  @SubscribeMessage('connectUser')
  handleUserConnection(@MessageBody() userId: string, @ConnectedSocket() socket: any) {
    this.usersSockets.set(userId, socket.id);
    socket.join(userId); 
  }

  @SubscribeMessage('disconnectUser')
  handleUserDisconnection(@MessageBody() userId: string) {
    this.usersSockets.delete(userId);
    console.log(`User ${userId} disconnected from the socket`);
  }

  sendLogMessage(userId: string, message: string) {
    const socketId = this.usersSockets.get(userId);
    if (socketId) {
      console.log(`Sending log to user ${userId}: ${message}`);
      try {
        this.server.to(socketId).emit('log', message);  
      } catch (error) {
        console.error(`Error sending message to user ${userId}: ${error.message}`);
      }
    } else {
      console.log(`Socket not found for user ${userId}`);
    }
  }
}
