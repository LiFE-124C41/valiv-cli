import fs from 'fs';
import path from 'path';
import { ILogger } from '../domain/interfaces.js';

export class Logger implements ILogger {
  private logPath: string;

  constructor(configPath: string) {
    // configPath is the path to the json file, so we want the directory
    this.logPath = path.join(path.dirname(configPath), 'valiv_debug.log');
  }

  info(message: string, data?: unknown): void {
    console.log(message);
    this.writeToFile(
      'INFO',
      `${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`,
    );
  }

  warn(message: string, data?: unknown): void {
    console.warn(message);
    this.writeToFile(
      'WARN',
      `${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`,
    );
  }

  error(message: string, error?: unknown): void {
    // ユーザーには簡潔なメッセージを表示
    console.error(`${message} 時間を置いて再度お試し下さい。`);

    // 詳細なエラー情報はログファイルに記録
    if (error) {
      const errorMsg =
        error instanceof Error
          ? error.stack || error.message
          : JSON.stringify(error, null, 2);
      this.writeToFile('ERROR', `${message}\n${errorMsg}`);
    } else {
      this.writeToFile('ERROR', message);
    }
  }

  debug(message: string, data?: unknown): void {
    // デバッグ情報はログファイルにのみ記録（コンソールは汚さない）
    this.writeToFile(
      'DEBUG',
      `${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`,
    );
  }

  getLogPath(): string {
    return this.logPath;
  }

  private writeToFile(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    try {
      fs.appendFileSync(this.logPath, logEntry);
    } catch {
      // ログ書き込み失敗は無視
    }
  }
}
