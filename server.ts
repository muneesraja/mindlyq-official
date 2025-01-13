import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { startCronJobs } from './services/cron';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

console.log(`Starting server with configuration:`);
console.log(`- Environment: ${process.env.NODE_ENV}`);
console.log(`- Port: ${port}`);
console.log(`- Hostname: ${hostname}`);

const app = next({
  dev,
  hostname,
  port,
});

const handle = app.getRequestHandler();

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.prepare().then(() => {
  startCronJobs();
  console.log(' CRON jobs started');

  const server = createServer(async (req, res) => {
    try {
      // Add CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Handle OPTIONS request
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');

      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Error handling for server
  server.on('error', (err) => {
    console.error('Server error:', err);
  });

  // Keep-alive timeout
  server.keepAliveTimeout = 65000; // Slightly higher than 60 seconds
  server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout

  // Graceful shutdown
  const shutdown = () => {
    console.log('Received kill signal, shutting down gracefully');
    server.close(() => {
      console.log('Closed out remaining connections');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  server.listen(port, hostname, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.NODE_ENV
      }`
    );
  });
});
