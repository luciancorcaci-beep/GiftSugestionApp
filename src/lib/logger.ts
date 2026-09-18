export type LogLevel = 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

export type LogEntry = LogContext & {
  level: LogLevel;
  message: string;
  timestamp: string;
};

export type LogSink = (entry: LogEntry) => void;

export interface Logger {
  info(context: LogContext, message: string): void;
  warn(context: LogContext, message: string): void;
  error(context: LogContext, message: string): void;
}

const SENSITIVE_KEY_PATTERN = /password|secret|token|api[-_]?key|authorization|cookie/i;

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key)).map(([key, nestedValue]) => [
        key,
        sanitizeValue(nestedValue),
      ]),
    );
  }

  return value;
}

function sanitizeContext(context: LogContext): LogContext {
  return sanitizeValue(context) as LogContext;
}

function writeToStdout(entry: LogEntry): void {
  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

export function createLogger(sink: LogSink = writeToStdout): Logger {
  function log(level: LogLevel, context: LogContext, message: string): void {
    sink({
      ...sanitizeContext(context),
      level,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    info: (context, message) => log('info', context, message),
    warn: (context, message) => log('warn', context, message),
    error: (context, message) => log('error', context, message),
  };
}

export const logger = createLogger();