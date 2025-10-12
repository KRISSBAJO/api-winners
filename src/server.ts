// src/server.ts (Full integration: HTTP server + Socket.IO + resilient listen)
import http from 'http';
import app from "./app";
import { initSocket, io } from "./realtime/socket";
import { connectDB } from "./config/db";
import { execSync } from 'child_process';

const PORT = process.env.PORT || 5000;

const startServer = (port: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    // Create HTTP server
    const server = http.createServer(app);
    
    // Init Socket.IO after server creation
    initSocket(server);

    server.listen(port, (err?: Error) => {
      if (err) {
        console.error(`🚫 Failed to start on port ${port}: ${err.message}`);
        return reject(err);
      }
      const addr = server.address() as { port: number } | string;
      const bindPort = typeof addr === 'string' ? parseInt(addr.split(':').pop() || port.toString()) : addr?.port || port;
      console.log(`✅ Server running on http://localhost:${bindPort}`);
      console.log(`📘 Swagger Docs at http://localhost:${bindPort}/api-docs`);
      console.log(`🔌 Socket.IO ready on ws://localhost:${bindPort}`);
      resolve(bindPort);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`🔄 Port ${port} busy—trying next...`);
        server.close(); // Explicitly close to free socket
        resolve(-1); // Signal retry
      } else {
        reject(err);
      }
    });
  });
};

let currentPort = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

// Kill any process on initial port before starting (Windows-friendly)
try {
  execSync(`npx kill-port ${currentPort}`, { stdio: 'ignore' });
  console.log(`🔧 Cleared port ${currentPort} if in use`);
} catch {} // Ignore if not running or kill-port fails

// Start after DB (if applicable)
connectDB().then(async () => {
  try {
    while (true) {
      currentPort = await startServer(currentPort);
      if (currentPort > 0) break; // Success
      currentPort++; // Increment for next try
    }
  } catch (err) {
    console.error('💥 Fatal startup error:', err);
    process.exit(1);
  }
}).catch(console.error);

// Graceful shutdown on SIGINT/SIGTERM (Ctrl+C)
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  io?.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  io?.close();
  process.exit(0);
});