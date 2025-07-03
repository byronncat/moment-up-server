import * as winston from 'winston';

export type HttpMeta = {
  method: string;
  url: string;
  status: number;
  responseTime: number;
};

export type LogMeta = {
  location?: string;
  context?: string;
};

function padString(str: string, width: number, align: 'left' | 'right' = 'left') {
  return align === 'left' ? str.padEnd(width) : str.padStart(width);
}

const consoleTransport = new winston.transports.Console({
  level: 'silly', // Show all log levels
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

      // === HTTP ===
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

      // === Other Logs ===
      const logMeta = meta as unknown as LogMeta;

      let context = logMeta.context;
      let location = logMeta.location;
      const metaWithStack = meta as unknown as {
        stack?: Array<{ context?: string; location?: string }>;
      };
      if (!context && !location && metaWithStack.stack && Array.isArray(metaWithStack.stack)) {
        const stackMeta = metaWithStack.stack[0];
        if (stackMeta) {
          context = stackMeta.context;
          location = stackMeta.location;
        }
      }

      const coloredMessage = colorizer.colorize(rawLevel, String(message));
      const contextStr = context ? `[${context}]` : '[General]';
      const locationStr = location ? ` -${location}` : '';

      return `${coloredContext} ${padString(String(timestamp), 22, 'left')} ${padString(upperLevel, 17, 'right')} ${contextStr} ${coloredMessage}${locationStr}`;
    })
  ),
});

export function createWinstonTransports(isDevelopment: boolean): winston.transport[] {
  const transports: winston.transport[] = [consoleTransport];

  if (isDevelopment) {
    transports.push(
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
      })
    );
  }

  return transports;
}
