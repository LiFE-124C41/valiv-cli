import os
import sys
import datetime
import json
import re
import urllib.request
import urllib.parse
import urllib.error
import time
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
    TwitterAPI.io から指定ユーザーの統計情報を取得する (リトライ機能付き)
    """
    url = f"https://api.twitterapi.io/twitter/user/info?userName={urllib.parse.quote(username)}"
    
    max_retries = 3
    retry_delay = 5  # 秒
    
    for attempt in range(1, max_retries + 1):
        req = urllib.request.Request(url)
        req.add_header("X-API-Key", api_key)
        
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                
                # ルートが "user" オブジェクトに包まれている場合の対応
                if "user" in data and isinstance(data["user"], dict):
                    user_data = data["user"]
                else:
                    user_data = data
                
                # APIレスポンス構造の解析と安全な抽出
                followers = user_data.get("followers_count")
                tweets = user_data.get("tweet_count")
                listed = user_data.get("listed_count")
                following = user_data.get("following_count")
                
                # public_metrics 等のネストした構造のケースに対応
                if followers is None and "public_metrics" in user_data:
                    metrics = user_data["public_metrics"]
                    followers = metrics.get("followers_count")
                    tweets = metrics.get("tweet_count") or metrics.get("post_count")
                    listed = metrics.get("listed_count")
                    following = metrics.get("following_count")
                
                # 代替キー名の対応
                if tweets is None:
                    tweets = user_data.get("post_count") or user_data.get("statuses_count")
                if followers is None:
                    followers = user_data.get("followers")
                if following is None:
                    following = user_data.get("friends_count") or user_data.get("following")
                if listed is None:
                    listed = user_data.get("listed")
                
                if followers is None:
                    print(f"[{username}] 警告: followers_count がレスポンスに見つかりません。レスポンスデータの一部: {json.dumps(data)[:300]}")
                    
                return {
                    "followers": followers,
                    "tweets": tweets,
                    "listed": listed,
                    "following": following
                }
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait_time = retry_delay * attempt * 2
                print(f"[{username}] HTTP 429 Too Many Requests が発生しました。{wait_time} 秒後にリトライします... (試行 {attempt}/{max_retries})")
                time.sleep(wait_time)
            else:
                print(f"[{username}] HTTPエラーが発生しました (ステータスコード {e.code}): {e.reason}")
                if attempt < max_retries:
                    time.sleep(retry_delay)
                else:
                    return None
        except Exception as e:
            print(f"[{username}] データ取得中に例外が発生しました: {e}")
            if attempt < max_retries:
                time.sleep(retry_delay)
            else:
                return None
                
    print(f"[{username}] 最大リトライ回数に達したため、データ取得を断念します。")
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
    for i, member in enumerate(members):
        member_id = member['member_id']
        name = member['name']
        x_username = member['x_username']
        
        if i > 0:
            # レート制限 (HTTP 429) を避けるためリクエスト間にディレイを挟む
            # TwitterAPI.io の無料プランの制限 (5秒に1回) を考慮し、6秒待機します
            print("レート制限回避のため、6秒待機します...")
            time.sleep(6)
            
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
