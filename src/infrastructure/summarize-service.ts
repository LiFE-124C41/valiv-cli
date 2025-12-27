import { ISummarizeService } from '../domain/interfaces.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { YoutubeTranscript } from 'youtube-transcript-plus';

export class SummarizeService implements ISummarizeService {
  async summarizeVideo(
    videoId: string,
    apiKey: string,
    onProgress?: (message: string) => void,
  ): Promise<string> {
    // IDのクレンジング (RSS由来の yt:video: を削除)
    const cleanVideoId = videoId.replace(/^yt:video:/, '');

    try {
      if (onProgress) onProgress('Fetching transcript...');

      // まず日本語の字幕取得を試みる
      let transcriptItems;
      try {
        transcriptItems = await YoutubeTranscript.fetchTranscript(
          cleanVideoId,
          {
            lang: 'ja',
          },
        );
        if (!transcriptItems || transcriptItems.length === 0) {
          throw new Error('Japanese transcript empty');
        }
      } catch (e) {
        // 日本語がない、または取得に失敗した場合はデフォルト（英語/自動生成など）を取得
        try {
          transcriptItems =
            await YoutubeTranscript.fetchTranscript(cleanVideoId);
        } catch (e2) {
          const msg1 = e instanceof Error ? e.message : String(e);
          const msg2 = e2 instanceof Error ? e2.message : String(e2);
          return `字幕が見つかりませんでした。(Video ID: ${cleanVideoId})\nError(JA): ${msg1}\nError(Default): ${msg2}`;
        }
      }

      if (!transcriptItems || transcriptItems.length === 0) {
        // ライブラリで取得できなかった場合、自前実装のフォールバックを試みる
        try {
          if (onProgress) onProgress('Fetching transcript (fallback mode)...');
          const manualText = await this.fetchManualTranscript(cleanVideoId);
          if (manualText) {
            // 手動取得成功
            return await this.generateSummaryWithGemini(
              apiKey,
              manualText,
              onProgress,
            );
          }
        } catch (manualError) {
          const mErr =
            manualError instanceof Error
              ? manualError.message
              : String(manualError);
          return `字幕データが見つかりませんでした。(Video ID: ${cleanVideoId})
考えられる原因: 動画に字幕がない、または自動生成中。
(Library Result: Empty, Fallback Error: ${mErr})`;
        }

        return `字幕データが見つかりませんでした。(Video ID: ${cleanVideoId}) - Library returned empty`;
      }

      const fullText = transcriptItems.map((item) => item.text).join(' ');

      return await this.generateSummaryWithGemini(
        apiKey,
        fullText,
        onProgress,
      );
    } catch (error) {
      // エラーログは出さず、UIに表示するメッセージを返す
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Transcript is disabled')) {
        return 'この動画では字幕が無効になっているため要約できません。';
      }
      return `要約中にエラーが発生しました: ${errorMessage}`;
    }
  }

  private generatePrompt(transcript: string): string {
    return `
あなたはアイドルマスター vα-liv (ヴイアラ) の専任プロデューサー兼、熱心なファンです。
以下のYouTube動画の字幕データをもとに、ファンに向けた魅力的な「要約レポート」を作成してください。

ターゲット: vα-liv のファン（プロデューサー）
口調: 丁寧だが熱量があり、読みやすい日本語。

前提情報（クリエイタープロフィール）:
メインのクリエイターは下記の３人です。要約する時に名前を間違えないで下さい。

- 灯里 愛夏
  - ローマ字：Manaka Tomori
  - 愛称：愛夏
- 上水流 宇宙
  - ローマ字：Cosmo Kamizuru
  - 愛称：宇宙
- サラ レトラ オリヴェイラ ウタガワ
  - ローマ字：Sara Letora Oliveira Utagawa
  - 愛称：レトラ

出力フォーマット（Markdown形式）:

### 📺 配信概要
(配信の全体的なテーマ、何をしたか、雑談のメインテーマなどを2-3行で要約)

### ✨ 見どころ・ハイライト
(特に面白かったシーン、可愛かった発言、盛り上がった瞬間などを箇条書きで3〜5点抽出)
-
-
-

### 🎵 セットリスト (歌枠・カラオケの場合のみ)
(歌唱された楽曲があればリストアップしてください。なければ「なし」と記載するか、このセクションを省略してください)

### 📢 告知・重要事項
(今後の予定、グッズ情報、イベント告知などがあれば記載)

---
字幕データ:
${transcript}
`;
  }

  private async generateSummaryWithGemini(
    apiKey: string,
    transcript: string,
    onProgress?: (message: string) => void,
  ): Promise<string> {
    if (onProgress) onProgress('Generating summary with Gemini...');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
    });

    const prompt = this.generatePrompt(transcript);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (response.usageMetadata) {
      const { promptTokenCount, candidatesTokenCount, totalTokenCount } =
        response.usageMetadata;
      return `${text}\n\n---\n[Gemini Usage] Input: ${promptTokenCount} / Output: ${candidatesTokenCount} / Total: ${totalTokenCount} tokens`;
    }

    return text;
  }
  private async fetchManualTranscript(videoId: string): Promise<string> {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    const html = await res.text();

    // captionTracksを探す
    const match = html.match(/"captionTracks":(\[.*?\])/);
    if (!match) {
      throw new Error('Caption tracks not found in HTML (Main regex failed)');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracks = JSON.parse(match[1]) as any[];
    // 日本語を探す (ja, ja-JP など)
    let track = tracks.find((t) => t.languageCode === 'ja');
    if (!track) {
      track = tracks.find(
        (t) => t.languageCode && t.languageCode.startsWith('ja'),
      );
    }
    // なければデフォルト（どれでもいい、おそらく英語か自動生成）
    if (!track && tracks.length > 0) {
      track = tracks[0];
    }

    if (!track) {
      throw new Error('No usable caption track found in extracted list');
    }

    // JSON形式(fmt=json3)を強制して取得しやすくする
    const baseUrl = track.baseUrl;
    const jsonUrl = baseUrl.includes('fmt=')
      ? baseUrl.replace(/fmt=[^&]+/, 'fmt=json3')
      : `${baseUrl}&fmt=json3`;

    const jsonRes = await fetch(jsonUrl);
    const jsonData = await jsonRes.json();

    if (!jsonData.events) {
      throw new Error('Invalid JSON transcript format (no events)');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = jsonData.events as any[];

    return events
      .map((event) => {
        if (!event.segs) return '';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return event.segs.map((seg: any) => seg.utf8).join('');
      })
      .join(' ')
      .replace(/\s+/g, ' '); // 余分な空白削除
  }
}
