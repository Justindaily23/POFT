import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

const isTestEnvironment = process.env.NODE_ENV === 'test';

const consoleTransport = new winston.transports.Console({
  format: nestWinstonModuleUtilities.format.nestLike(),
});

const fileTransports = [
  new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  new winston.transports.File({ filename: 'logs/warn.log', level: 'warn' }),
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

export const logger = winston.createLogger({
  level: isTestEnvironment ? 'silent' : 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: isTestEnvironment ? [consoleTransport] : [consoleTransport, ...fileTransports],
});
