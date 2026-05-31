import app from './app';
import { env } from './config/env';
import redis from './lib/redis';

app.listen(env.PORT, () => {
  console.log(`[server] Running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});