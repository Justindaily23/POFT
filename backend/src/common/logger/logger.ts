// import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
// import * as winston from 'winston';

// const isTestEnvironment = process.env.NODE_ENV === 'test';

// const consoleTransport = new winston.transports.Console({
//   format: nestWinstonModuleUtilities.format.nestLike(),
// });

// const fileTransports = [
//   new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
//   new winston.transports.File({ filename: 'logs/warn.log', level: 'warn' }),
//   new winston.transports.File({ filename: 'logs/combined.log' }),
// ];

// export const logger = winston.createLogger({
//   level: isTestEnvironment ? 'silent' : 'info',
//   format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
//   transports: isTestEnvironment ? [consoleTransport] : [consoleTransport, ...fileTransports],
// });


import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const isProductionEnvironment = process.env.NODE_ENV === 'production';

// 1. Better Stack Handshake Guard
const token = process.env.LOGTAIL_SOURCE_TOKEN;
const logtailClient = token ? new Logtail(token) : null;

const consoleTransport = new winston.transports.Console({
  format: nestWinstonModuleUtilities.format.nestLike(),
});

// 2. Keep local text files ONLY when writing code on your local computer
const fileTransports = [
  new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  new winston.transports.File({ filename: 'logs/warn.log', level: 'warn' }),
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

// 3. Assemble transports dynamically based on active environment targets
const activeTransports: winston.transport[] = [consoleTransport];

if (isTestEnvironment) {
  // If running tests, remain completely silent
} else if (isProductionEnvironment) {
  //On Render Production: Feed logs over secure network threads straight to Better Stack
  if (logtailClient) {
    activeTransports.push(new LogtailTransport(logtailClient));
  }
} else {
  // On your local WSL Docker environment: Write to local logs/ text folders normally
  activeTransports.push(...fileTransports);
}

export const logger = winston.createLogger({
  level: isTestEnvironment ? 'silent' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(), 
    winston.format.json()
  ),
  transports: activeTransports,
});
