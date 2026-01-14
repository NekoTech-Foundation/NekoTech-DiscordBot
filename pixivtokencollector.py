import hashlib
import base64
import os
import urllib.parse
import urllib.request
import json
import ssl

def get_refresh_token_ultimate_fixed_v2():
    print("--- Lấy Pixiv Refresh Token (Phiên bản dùng thư viện chuẩn) ---")

    # 1. Generate and print the login URL
    code_verifier = base64.urlsafe_b64encode(os.urandom(32)).rstrip(b"=").decode('utf-8')
    code_challenge = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode('utf-8')).digest()).rstrip(b"=").decode('utf-8')
    params = {'code_challenge': code_challenge, 'code_challenge_method': 'S256', 'client': 'pixiv-android'}
    login_url = "https://app-api.pixiv.net/web/v1/login?" + urllib.parse.urlencode(params)

    print("\nBước 1: Mở URL đăng nhập")
    print("Một URL đã được tạo. Hãy sao chép và dán vào một tab trình duyệt MỚI (nơi bạn sẽ mở F12).")
    print("-" * 20)
    print(login_url)
    print("-" * 20)

    # 2. Ask for the URL and PARSE the code from it
    print("\nBước 2: Tìm và dán URL chứa mã 'code' vào đây.")
    print("Hãy làm theo hướng dẫn để tìm URL 'pixiv://...' trong công cụ phát triển (F12) của trình duyệt.")
    callback_url = input("Dán toàn bộ URL 'pixiv://...' bạn tìm thấy vào đây rồi nhấn Enter:\n> ")

    try:
        parsed_url = urllib.parse.urlparse(callback_url)
        query_params = urllib.parse.parse_qs(parsed_url.query)
        if 'code' not in query_params:
            # Maybe it's in the fragment?
            query_params = urllib.parse.parse_qs(parsed_url.fragment)
        
        code = query_params['code'][0]
    except (KeyError, IndexError):
        print("\n--- LỖI ---")
        print("URL bạn dán vào không hợp lệ hoặc không chứa 'code'. Vui lòng chạy lại script.")
        return

    # 3. Exchange the code for a token
    print("\nĐang đổi mã lấy token...")
    data = urllib.parse.urlencode({
        "client_id": "MOBrBDS8blbauoSck0ZfDbtuzpyT",
        "client_secret": "lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj",
        "grant_type": "authorization_code",
        "code": code,
        "code_verifier": code_verifier,
        "redirect_uri": "https://app-api.pixiv.net/web/v1/users/auth/pixiv/callback",
    }).encode('utf-8')

    headers = {
        "User-Agent": "PixivAndroidApp/5.0.234 (Android 11; Pixel 5)",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    req = urllib.request.Request("https://oauth.secure.pixiv.net/auth/token", data=data, headers=headers, method="POST")

    try:
        # Create context to ignore certificate errors if any, though Pixiv usually has valid certs
        context = ssl.create_default_context()
        
        with urllib.request.urlopen(req, context=context) as response:
            if response.status != 200:
                 print(f"Lỗi: HTTP {response.status}")
                 return

            response_body = response.read().decode('utf-8')
            token_data = json.loads(response_body)

            if "refresh_token" in token_data:
                print("\n--- THÀNH CÔNG! ---")
                print(f"Refresh Token của bạn là: {token_data['refresh_token']}")
                print("\nBước 3: Hãy sao chép token này và dán vào file config.yml của bot.")
                print("Lưu ý: Đừng chia sẻ token này cho ai khác.")
            else:
                print("\n--- LỖI KHI ĐỔI TOKEN ---")
                print("Phản hồi từ server:", token_data)

    except urllib.error.HTTPError as e:
        print(f"\n--- LỖI HTTP ---")
        print(f"HTTP Code: {e.code}")
        try:
            error_body = e.read().decode('utf-8')
            print("Chi tiết lỗi:", error_body)
        except:
            pass
    except Exception as e:
        print(f"\n--- LỖI KHÔNG XÁC ĐỊNH --- \n{e}")

if __name__ == "__main__":
    get_refresh_token_ultimate_fixed_v2()