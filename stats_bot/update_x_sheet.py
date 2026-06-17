import os
import sys
import datetime
import json
import re
import urllib.request
import urllib.parse
import gspread
from google.oauth2.service_account import Credentials

# スプレッドシートの名前 (既存のものと同一)
SPREADSHEET_NAME = 'valiv_youtube_data_log'

# constants.ts のパス (このスクリプトからの相対パス)
CONSTANTS_PATH = os.path.join(os.path.dirname(__file__), '../src/domain/constants.ts')

def get_x_members_from_ts(file_path):
    """
    TypeScriptファイルから id, name, xUsername を抽出する
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # クリエイターオブジェクト `{ ... }` の部分を切り出す
        blocks = re.findall(r'\{[^{}]+\}', content)
        
        members = []
        for block in blocks:
            id_match = re.search(r"id:\s*(['\"])(.*?)\1", block)
            name_match = re.search(r"name:\s*(['\"])(.*?)\1", block)
            x_username_match = re.search(r"xUsername:\s*(['\"])(.*?)\1", block)
            
            if id_match and name_match and x_username_match:
                members.append({
                    "member_id": id_match.group(2),
                    "name": name_match.group(2),
                    "x_username": x_username_match.group(2)
                })
        return members
        
    except FileNotFoundError:
        print(f"Error: {file_path} が見つかりませんでした。")
        return []
    except Exception as e:
        print(f"Error parsing constants.ts: {e}")
        return []

def fetch_x_stats(username, api_key):
    """
    TwitterAPI.io から指定ユーザーの統計情報を取得する
    """
    url = f"https://api.twitterapi.io/twitter/user/info?userName={urllib.parse.quote(username)}"
    req = urllib.request.Request(url)
    req.add_header("X-API-Key", api_key)
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            # APIレスポンス構造の解析と安全な抽出
            followers = data.get("followers_count")
            tweets = data.get("tweet_count")
            listed = data.get("listed_count")
            following = data.get("following_count")
            
            # public_metrics 等のネストした構造のケースに対応
            if followers is None and "public_metrics" in data:
                metrics = data["public_metrics"]
                followers = metrics.get("followers_count")
                tweets = metrics.get("tweet_count") or metrics.get("post_count")
                listed = metrics.get("listed_count")
                following = metrics.get("following_count")
            
            # 代替キー名の対応
            if tweets is None:
                tweets = data.get("post_count") or data.get("statuses_count")
            if followers is None:
                followers = data.get("followers")
            if following is None:
                following = data.get("friends_count") or data.get("following")
            if listed is None:
                listed = data.get("listed")
                
            return {
                "followers": followers,
                "tweets": tweets,
                "listed": listed,
                "following": following
            }
    except Exception as e:
        print(f"[{username}] TwitterAPI.io からのデータ取得に失敗しました: {e}")
        return None

def main():
    # 1. 環境変数から認証情報を取得
    service_account_json = os.environ.get("GCP_SERVICE_ACCOUNT_JSON")
    twitter_api_key = os.environ.get("TWITTER_API_IO_KEY")

    if not service_account_json:
        raise ValueError("GCP_SERVICE_ACCOUNT_JSON が設定されていません。")
    if not twitter_api_key:
        raise ValueError("TWITTER_API_IO_KEY が設定されていません。")

    # サービスアカウント情報のロード
    service_account_info = json.loads(service_account_json)

    # 2. クリエイター情報の取得 (constants.ts から読み込み)
    members = get_x_members_from_ts(CONSTANTS_PATH)
    if not members:
        print("X (Twitter) のユーザー情報を持つクリエイターが見つかりませんでした。")
        sys.exit(1)

    print(f"{len(members)} 件の X クリエイター情報を読み込みました。")

    # 3. Google Sheets API の準備
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    creds = Credentials.from_service_account_info(service_account_info, scopes=scopes)
    client = gspread.authorize(creds)

    try:
        spreadsheet = client.open(SPREADSHEET_NAME)
    except gspread.exceptions.SpreadsheetNotFound:
        print(f"Error: スプレッドシート '{SPREADSHEET_NAME}' が見つかりませんでした。")
        sys.exit(1)

    # ワークシート 'x_stats' の取得または作成
    try:
        sheet = spreadsheet.worksheet("x_stats")
    except gspread.exceptions.WorksheetNotFound:
        print("ワークシート 'x_stats' を作成します。")
        sheet = spreadsheet.add_worksheet(title="x_stats", rows=1000, cols=10)
        # ヘッダー行を追加
        sheet.append_row(["Date", "Member ID", "Name", "Followers", "Tweets", "Listed", "Following"])

    today = datetime.date.today().strftime('%Y-%m-%d')

    # 4. 各ユーザーのデータを取得してスプレッドシートに書き込み
    has_error = False
    for member in members:
        member_id = member['member_id']
        name = member['name']
        x_username = member['x_username']
        
        print(f"[{name}] (@{x_username}) のデータを取得中...")
        stats = fetch_x_stats(x_username, twitter_api_key)
        
        if not stats or stats["followers"] is None:
            print(f"[{name}] データの取得に失敗しました。")
            has_error = True
            continue
            
        followers = stats["followers"]
        tweets = stats["tweets"]
        listed = stats["listed"]
        following = stats["following"]
        
        print(f"取得成功: {name} - フォロワー: {followers}, ポスト数: {tweets}, リスト数: {listed}, フォロー数: {following}")
        
        try:
            # 最終行にデータを追加 [日付, メンバーID, 名前, フォロワー数, 総ポスト数, リスト登録数, フォロー数]
            sheet.append_row([today, member_id, name, followers, tweets, listed, following], value_input_option='USER_ENTERED')
        except Exception as e:
            print(f"[{name}] スプレッドシートへの追加に失敗しました: {e}")
            has_error = True

    if has_error:
        print("一部の処理でエラーが発生したため、異常終了します。")
        sys.exit(1)
        
    print("すべての X 統計データの更新が完了しました。")

if __name__ == "__main__":
    main()
