import { Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs';

export function downloadBackup(req: Request, res: Response) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    res.status(500).json({ error: 'DATABASE_URL не настроен' });
    return;
  }

  // pg_dump и psql не понимают параметр ?schema=public, который нужен для Prisma
  const cleanDbUrl = dbUrl.split('?')[0];

  const date = new Date().toISOString().split('T')[0];
  const filename = `backup_${date}.sql`;

  res.setHeader('Content-Type', 'application/sql');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const child = exec(`pg_dump "${cleanDbUrl}" --clean --if-exists`);

  child.stdout?.pipe(res);

  child.stderr?.on('data', (data) => {
    console.error('pg_dump error:', data);
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`pg_dump завершился с кодом ${code}`);
      if (!res.headersSent) {
        res.status(500).end('Ошибка при создании бэкапа');
      }
    }
  });
}

export function restoreBackup(req: Request, res: Response) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    res.status(500).json({ error: 'DATABASE_URL не настроен' });
    return;
  }

  // pg_dump и psql не понимают параметр ?schema=public
  const cleanDbUrl = dbUrl.split('?')[0];

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'Файл не загружен' });
    return;
  }

  // Восстанавливаем базу из файла
  const child = exec(`psql "${cleanDbUrl}" -f "${file.path}"`);

  let errorOutput = '';

  child.stderr?.on('data', (data) => {
    errorOutput += data;
  });

  child.on('close', (code) => {
    // Удаляем временный файл после загрузки
    fs.unlink(file.path, (err) => {
      if (err) console.error('Ошибка при удалении временного файла:', err);
    });

    if (code !== 0) {
      console.error(`psql error output: ${errorOutput}`);
      res.status(500).json({ error: 'Ошибка при восстановлении базы данных' });
    } else {
      res.json({ message: 'База данных успешно восстановлена!' });
    }
  });
}
