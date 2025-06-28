import * as winston from 'winston';

type ApiLog = {
  method: string;
  url: string;
  status: number;
  responseTime: number;
};

function padString(str: string, width: number) {
  return str.padEnd(width);
}

export const winstonTransports = [
  new winston.transports.Console({
    level: 'silly', // Show all log levels
    format: winston.format.combine(
      winston.format.timestamp({ format: 'MM/DD/YYYY, h:mm:ss A' }),
      winston.format.colorize(),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        const rawLevel = info[Symbol.for('level')]; // Get the original level without color codes
        const pid = process.pid;
        const colorizer = winston.format.colorize();
        const coloredContext = colorizer.colorize('info', `[${meta.context || 'Nest'}] ${pid}  -`);

        if (rawLevel === 'http') {
          const logData = meta as ApiLog;

          const method = logData.method || 'UNKNOWN_METHOD';
          const url = logData.url || 'UNKNOWN_URL';
          const status = logData.status || 'UNKNOWN_STATUS';
          const responseTime = `${logData.responseTime}ms` || 'UNKNOWN_TIME';

          const coloredStatus =
            typeof status === 'number'
              ? status >= 200 && status < 300
                ? colorizer.colorize('info', `${status}`)
                : status >= 300 && status < 400
                  ? colorizer.colorize('warn', `${status}`)
                  : colorizer.colorize('error', `${status}`)
              : status;

          return `${coloredContext} ${padString(String(timestamp), 26)} ${method} ${coloredStatus} ${url} +${responseTime}`;
        }
        return `${coloredContext} ${padString(String(timestamp), 26)} ${level} ${String(message)}`;
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
