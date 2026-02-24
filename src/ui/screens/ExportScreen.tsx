import React, { useEffect, useState } from 'react';
import { Text, Box, useApp } from 'ink';
import { ConfigRepository } from '../../infrastructure/config-repository.js';
import { TranscriptCacheRepository } from '../../infrastructure/transcript-cache-repository.js';
import Spinner from 'ink-spinner';
import * as fs from 'fs';
import * as path from 'path';

interface Props {
  configRepo: ConfigRepository;
  filterId?: string;
  outputDir: string;
  format: string;
}

const ExportScreen: React.FC<Props> = ({
  configRepo,
  filterId,
  outputDir,
  format,
}) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<string>('Initializing export...');
  const [exportedCount, setExportedCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const runExport = async () => {
      try {
        const cacheRepo = new TranscriptCacheRepository();
        let creators = configRepo.getCreators();

        if (filterId) {
          creators = creators.filter(
            (c) =>
              c.id.toLowerCase().includes(filterId.toLowerCase()) ||
              c.name.toLowerCase().includes(filterId.toLowerCase()),
          );
        }

        if (creators.length === 0) {
          setErrorMsg('No matching creator found.');
          setCompleted(true);
          return;
        }

        // フォルダの準備
        const targetDir = path.resolve(process.cwd(), outputDir);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        let count = 0;

        for (const creator of creators) {
          setStatus(`Exporting transcripts for ${creator.name}...`);
          const videoIds = cacheRepo.getAllCachedVideoIds(creator.id);

          for (const videoId of videoIds) {
            const entry = cacheRepo.getTranscript(videoId);
            if (!entry) continue;

            const safeTitle = entry.videoTitle
              ? entry.videoTitle.replace(/[\\/:*?"<>|]/g, '_')
              : videoId;

            const ext =
              format === 'json' ? 'json' : format === 'text' ? 'txt' : 'md';
            const fileName = `${creator.id}_${videoId}.${ext}`;
            const filePath = path.join(targetDir, fileName);

            let content = '';

            if (format === 'json') {
              content = JSON.stringify(entry, null, 2);
            } else if (format === 'text') {
              content = entry.transcript.map((t) => t.text).join('\n');
            } else {
              // Markdown default
              content = `# Transcript: ${entry.videoTitle || 'Unknown Title'} (Video ID: ${videoId})\n\n`;
              content += `## メタデータ\n`;
              content += `- クリエイター: ${creator.name} (${creator.id})\n`;
              content += `- エクスポート日時: ${new Date().toISOString()}\n`;
              content += `- キャッシュ取得日時: ${entry.cachedAt}\n\n`;
              content += `## 字幕データ\n\n`;

              for (const t of entry.transcript) {
                const hh = Math.floor(t.offset / 3600)
                  .toString()
                  .padStart(2, '0');
                const mm = Math.floor((t.offset % 3600) / 60)
                  .toString()
                  .padStart(2, '0');
                const ss = Math.floor(t.offset % 60)
                  .toString()
                  .padStart(2, '0');
                content += `[${hh}:${mm}:${ss}] ${t.text}\n`;
              }
            }

            fs.writeFileSync(filePath, content, 'utf-8');
            count++;
          }
        }

        setExportedCount(count);
        setStatus(`Export complete! Target directory: ${targetDir}`);
      } catch (e) {
        setErrorMsg(
          e instanceof Error ? e.message : 'Unknown error during export',
        );
      } finally {
        setCompleted(true);
      }
    };

    runExport().then(() => setTimeout(() => exit(), 100)); // 少し待って終了
  }, [configRepo, filterId, outputDir, format, exit]);

  return (
    <Box flexDirection="column" paddingY={1}>
      {errorMsg ? (
        <Text color="red">Export Failed: {errorMsg}</Text>
      ) : completed ? (
        <Box flexDirection="column">
          <Text color="green" bold>
            ✔ {status}
          </Text>
          <Text>Exported {exportedCount} files.</Text>
        </Box>
      ) : (
        <Box>
          <Text color="green">
            <Spinner type="dots" />{' '}
          </Text>
          <Text>{status}</Text>
        </Box>
      )}
    </Box>
  );
};

module.exports = ExportScreen;
export default ExportScreen;
