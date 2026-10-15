import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const isProductionEnvironment = process.env.NODE_ENV === 'production';

// 1. Better Stack client (token + ingesting host from the source page)
const token = process.env.LOGTAIL_SOURCE_TOKEN?.trim();
const host = process.env.LOGTAIL_INGESTING_HOST?.trim();

const logtailClient = token
  ? new Logtail(token, {
      ...(host && { endpoint: `https://${host}` }),
      ignoreExceptions: true, // a logging outage shouldn't crash or spam your app
    })
  : null;

if (isProductionEnvironment && !logtailClient) {
  console.warn('LOGTAIL_SOURCE_TOKEN is not set; logs will only go to console');
}

const consoleTransport = new winston.transports.Console({
  format: nestWinstonModuleUtilities.format.nestLike(),
});

// 2. Local text files, only used outside production and tests
const fileTransports = [
  new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  new winston.transports.File({ filename: 'logs/warn.log', level: 'warn' }),
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

// 3. Assemble transports based on the environment
const activeTransports: winston.transport[] = [consoleTransport];

if (isTestEnvironment) {
  // Tests: console only, and the logger level below is 'silent'
} else if (isProductionEnvironment) {
  // Production (Render): ship logs to Better Stack
  if (logtailClient) {
    activeTransports.push(new LogtailTransport(logtailClient));
  }
} else {
  // Local dev: write to logs/ text files
  activeTransports.push(...fileTransports);
}

export const logger = winston.createLogger({
  level: isTestEnvironment ? 'silent' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: activeTransports,
});

// Call on shutdown so buffered logs aren't lost
export const flushLogs = async () => {
  await logtailClient?.flush();
};