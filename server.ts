import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { startCronJobs } from './services/cron';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';

// Railway specific port handling
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${port}`);
console.log(`Hostname: ${hostname}`);

// Prepare Next.js app with custom settings
const app = next({
  dev,
  hostname,
  port,
  conf: {
    compress: true,
    poweredByHeader: false,
    generateEtags: true,
  }
});

const handle = app.getRequestHandler();

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.prepare().then(() => {
  startCronJobs();
  console.log(' CRON jobs started');

  const server = createServer(async (req, res) => {
    try {
      // Log incoming requests in production
      if (!dev) {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.headers.host}`);
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
    process.exit(1);
  });

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
