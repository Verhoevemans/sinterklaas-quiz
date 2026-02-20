import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { setupGameSocket } from './socket/gameSocket.js';

async function main(): Promise<void> {
  const port: number = parseInt(process.env.PORT || '3000');
  const frontendUrl: string = process.env.FRONTEND_URL || 'http://localhost:4200';

  // Connect to MongoDB
  await connectDatabase();

  // Create Express app
  const app = createApp();

  // Create HTTP server
  const httpServer = createServer(app);

  // Create Socket.io server
  const io = new Server(httpServer, {
    cors: {
      origin: frontendUrl,
      credentials: true,
    },
  });

  // Setup game socket handlers
  setupGameSocket(io);

  // Start server
  httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Frontend URL: ${frontendUrl}`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
