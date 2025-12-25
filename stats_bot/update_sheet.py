import os
import datetime
import json
import re
import gspread
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# スプレッドシートの名前
SPREADSHEET_NAME = 'subscribers_log'

# constants.ts のパス (このスクリプトからの相対パス)
CONSTANTS_PATH = os.path.join(os.path.dirname(__file__), '../src/domain/constants.ts')

def get_channel_info_from_ts(file_path):
    """
    TypeScriptファイルから id, name, youtubeChannelId を抽出する
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 正規表現で id, name, youtubeChannelId を抽出
        # id: '...', ... name: '...', ... youtubeChannelId: '...',
        # 順番に依存するため、constants.ts の構造が変わると動かなくなる点に注意
        pattern = r"id:\s*(['\"])(.*?)\1,.*?name:\s*(['\"])(.*?)\3,.*?youtubeChannelId:\s*(['\"])(.*?)\5"
        matches = re.findall(pattern, content, re.DOTALL)
        
        # matches は [(q1, id, q2, name, q3, channel_id), ...]
        channels = [{"member_id": m[1], "name": m[3], "youtube_id": m[5]} for m in matches]
        return channels
        
    except FileNotFoundError:
        print(f"Error: {file_path} が見つかりませんでした。")
        return []
    except Exception as e:
        print(f"Error parsing constants.ts: {e}")
        return []

def main():
    # 1. 環境変数から認証情報を取得
    service_account_json = os.environ.get("GCP_SERVICE_ACCOUNT_JSON")

    if not service_account_json:
        raise ValueError("Service Account JSON is missing.")

    # サービスアカウント情報のロード
    service_account_info = json.loads(service_account_json)

    # 2. チャンネル情報の取得 (constants.ts から読み込み)
    channels = get_channel_info_from_ts(CONSTANTS_PATH)
    if not channels:
        print("チャンネル情報が見つかりませんでした。")
        return

    print(f"{len(channels)} 件のチャンネル情報を読み込みました。")

    # 3. YouTube API & Google Sheets API の準備
    
    # 認証スコープの設定 (YouTube + Sheets + Drive)
    scopes = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    creds = Credentials.from_service_account_info(service_account_info, scopes=scopes)
    
    # YouTube API クライアントの構築 (Service Account Credentialsを使用)
    youtube = build('youtube', 'v3', credentials=creds)
    
    # Google Sheets クライアントの認証
    client = gspread.authorize(creds)

    try:
        spreadsheet = client.open(SPREADSHEET_NAME)
    except gspread.exceptions.SpreadsheetNotFound:
        print(f"Error: スプレッドシート '{SPREADSHEET_NAME}' が見つかりませんでした。")
        return

    today = datetime.date.today().strftime('%Y-%m-%d')

    # 4. 各チャンネルのデータを取得して書き込み
    for channel in channels:
        member_id = channel['member_id']
        name = channel['name']
        youtube_id = channel['youtube_id']
        
        try:
            # ワークシートの取得または作成
            try:
                sheet = spreadsheet.worksheet(member_id)
            except gspread.exceptions.WorksheetNotFound:
                print(f"ワークシート '{member_id}' を作成します。")
                sheet = spreadsheet.add_worksheet(title=member_id, rows=1000, cols=10)
                # ヘッダー行を追加
                sheet.append_row(["Date", "Subscribers", "Video Count", "View Count"])

            response = youtube.channels().list(
                part='statistics',
                id=youtube_id
            ).execute()

            if not response['items']:
                print(f"[{name}] チャンネルが見つかりませんでした (ID: {youtube_id})")
                continue

            stats = response['items'][0]['statistics']
            subscribers = int(stats['subscriberCount'])
            video_count = int(stats['videoCount'])
            view_count = int(stats['viewCount'])

            print(f"取得成功: {name} ({member_id}) - 登録者数: {subscribers}")

            # 最終行にデータを追加 [日付, 登録者数, 動画数, 総再生数]
            # IDごとのシートになったので名前カラムは削除してシンプルにしました
            sheet.append_row([today, subscribers, video_count, view_count], value_input_option='USER_ENTERED')
            
        except Exception as e:
            print(f"[{name}] エラーが発生しました: {e}")

    print("全チャンネルの処理が完了しました。")

if __name__ == "__main__":
    main()