import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { config } from './config';

const app = createApp();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
  },
});

io.on('connection', (socket) => {
  socket.emit('notification:new', {
    title: 'Realtime подключен',
    message: 'Система уведомлений активна',
    type: 'INFO',
  });
});

httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running on port ${config.port}`);
});
