import * as winston from 'winston';

type HttpMeta = {
  method: string;
  url: string;
  status: number;
  responseTime: number;
};

type LogMeta = {
  location?: string;
  context?: string;
};

function padString(str: string, width: number, align: 'left' | 'right' = 'left') {
  return align === 'left' ? str.padEnd(width) : str.padStart(width);
}

export const winstonTransports = [
  new winston.transports.Console({
    level: 'silly', // To show all log levels
    format: winston.format.combine(
      winston.format.timestamp({ format: 'MM/DD/YYYY, h:mm:ss A' }),
      winston.format.colorize(),
      winston.format.printf((info) => {
        const { timestamp, message, ...meta } = info;
        const rawLevel = info[Symbol.for('level')] as string;
        const pid = process.pid;
        const colorizer = winston.format.colorize();
        const coloredContext = colorizer.colorize('info', `[Nest] ${pid}  -`);
        const upperLevel = colorizer.colorize(rawLevel, rawLevel.toUpperCase());

        if (rawLevel === 'http') {
          const httpData = meta as unknown as HttpMeta;

          const method = httpData.method || 'UNKNOWN_METHOD';
          const url = httpData.url || 'UNKNOWN_URL';
          const status = httpData.status || 'UNKNOWN_STATUS';
          const responseTime = `${httpData.responseTime}ms` || 'UNKNOWN_TIME';

          const coloredStatus =
            typeof status === 'number'
              ? status >= 200 && status < 300
                ? colorizer.colorize('info', `${status}`)
                : status >= 300 && status < 400
                  ? colorizer.colorize('warn', `${status}`)
                  : colorizer.colorize('error', `${status}`)
              : status;

          const coloredResponseTime = colorizer.colorize('warn', `+${responseTime}`);

          return `${coloredContext} ${padString(String(timestamp), 22)} ${padString('HTTP', 7, 'right')} [${method}] ${coloredStatus} ${url} ${coloredResponseTime}`;
        }

        const logMeta = meta as unknown as LogMeta;
        const coloredMessage = colorizer.colorize(rawLevel, String(message));
        const contextStr = logMeta.context
          ? colorizer.colorize(rawLevel, `[${logMeta.context}]`)
          : '[General]';
        const locationStr = logMeta.location
          ? colorizer.colorize(rawLevel, ` - ${logMeta.location}`)
          : '';

        return `${coloredContext} ${padString(String(timestamp), 22, 'left')} ${padString(upperLevel, 17, 'right')} ${contextStr} ${coloredMessage}${locationStr}`;
      })
    ),
  }),
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'MM/DD/YYYY, h:mm:ss A' }),
      winston.format.json()
    ),
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'MM/DD/YYYY, h:mm:ss A' }),
      winston.format.json()
    ),
  }),
];
