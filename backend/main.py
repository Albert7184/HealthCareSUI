import time
import requests
import os
import json
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from dotenv import load_dotenv
load_dotenv()

# ==========================================
# 💎 CẤU HÌNH
# ==========================================
GOOGLE_API_KEY = "AIzaSyCCgcwzRritoQrV0Tbw9M3A6i2_wZdkpn8" 
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-flash-latest')

PACKAGE_ID = "0x260ba0cff26a1e8b46039504bcf88b918eade66b87d804bfe0c0f67423f18029"
MODULE_NAME = "payment"
EVENT_NAME = "PaymentReceived"
FULL_EVENT_TYPE = f"{PACKAGE_ID}::{MODULE_NAME}::{EVENT_NAME}"
RPC_URL = "https://fullnode.testnet.sui.io:443"

# 🔥 QUAN TRỌNG: Lấy đường dẫn gốc nơi chứa file main.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Ép đường dẫn file phải nằm trong thư mục backend
INFO_FILE = os.path.join(BASE_DIR, "user_info.json")
IMAGE_FILE = os.path.join(BASE_DIR, "user_upload.jpg") 
TEXT_FILE = os.path.join(BASE_DIR, "food_name.txt")
# File kết quả thì trỏ ngược ra frontend
OUTPUT_FILE = os.path.join(BASE_DIR, "../frontend/public/ai_result.json")

def save_result_for_web(text, status="success"):
    try:
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        data = { "status": status, "text": text, "timestamp": time.time() }
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        print(f"   ✅ [DONE] Đã ghi kết quả.")
    except Exception as e:
        print(f"❌ [ERROR] Lỗi ghi file JSON: {e}")

def call_gemini_sdk(prompt_text, image_path=None):
    try:
        safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        }
        content_parts = [prompt_text]
        if image_path and os.path.exists(image_path) and os.path.getsize(image_path) > 0:
             print("   📤 Đang tải ảnh lên Gemini...")
             sample_file = genai.upload_file(path=image_path, display_name="Food Image")
             content_parts.append(sample_file)

        print(f"   🤖 Đang chờ Gemini...")
        response = model.generate_content(content_parts, safety_settings=safety_settings)
        return response.text
    except Exception as e:
        return f"❌ Lỗi Gemini: {str(e)}"

def analyze_food():
    print(f"   🔍 Đang kiểm tra dữ liệu đầu vào...")
    has_image = False
    for i in range(3):
        if os.path.exists(IMAGE_FILE) and os.path.getsize(IMAGE_FILE) > 0:
            has_image = True; break
        time.sleep(0.5)
    
    if has_image:
        print("   📸 Phát hiện ẢNH...")
        prompt = "Bạn là chuyên gia dinh dưỡng. Phân tích món ăn trong ảnh: Tên, Calo, Macros. Trình bày Bảng Markdown."
        text = call_gemini_sdk(prompt, IMAGE_FILE)
        save_result_for_web(text)
        if os.path.exists(IMAGE_FILE): os.remove(IMAGE_FILE)
        return

    if os.path.exists(TEXT_FILE):
        try:
            with open(TEXT_FILE, "r", encoding="utf-8") as f: food_name = f.read().strip()
            if food_name:
                print(f"   📝 Phát hiện TÊN món: '{food_name}'")
                prompt = f"Phân tích dinh dưỡng món '{food_name}'. Trình bày Bảng Markdown."
                text = call_gemini_sdk(prompt)
                save_result_for_web(text)
            if os.path.exists(TEXT_FILE): os.remove(TEXT_FILE)
            return
        except: pass
    save_result_for_web("Vui lòng chụp ảnh hoặc nhập tên món ăn.", status="error")

def generate_menu():
    print(f"   🥦 Đang lập thực đơn...")
    print(f"   📂 Đọc file tại: {INFO_FILE}")
    
    time.sleep(1) # Chờ Frontend ghi xong

    user_data = ""
    user_goal_prompt = ""

    # Đọc file user_info.json
    if os.path.exists(INFO_FILE):
        try: 
            with open(INFO_FILE, "r", encoding="utf-8") as f: 
                content = f.read().strip()
                if content:
                    user_data = content
                    print(f"   ✅ ĐÃ TÌM THẤY DỮ LIỆU USER:\n{user_data}")
                    
                    if "Giảm mỡ" in content:
                        user_goal_prompt = "Mục tiêu: GIẢM MỠ (Thâm hụt Calo). Tăng Protein, giảm Carbs xấu."
                    elif "Tăng cơ" in content:
                        user_goal_prompt = "Mục tiêu: TĂNG CƠ (Dư Calo). Tăng Protein và Carbs tốt."
                    else:
                        user_goal_prompt = "Mục tiêu: DUY TRÌ sức khỏe."
                else:
                    print("   ⚠️ File user_info.json bị RỖNG!")
        except Exception as e: 
            print(f"   ❌ Lỗi đọc file: {e}")
    else:
        print(f"   ❌ KHÔNG TÌM THẤY FILE user_info.json tại đường dẫn trên!")

    # Nếu không đọc được dữ liệu, BÁO LỖI luôn chứ không dùng mặc định 65kg nữa
    if not user_data:
        msg = "⚠️ Hệ thống chưa nhận được chỉ số cơ thể. Vui lòng thử lại!"
        save_result_for_web(msg)
        return

    # Prompt
    prompt = f"""
    Bạn là chuyên gia dinh dưỡng.
    DỮ LIỆU KHÁCH HÀNG:
    {user_data}

    YÊU CẦU: {user_goal_prompt}

    NHIỆM VỤ:
    1. Lập thực đơn 7 ngày món Việt Nam DUY NHẤT cho mục tiêu trên.
    2. Tuyệt đối tuân thủ cân nặng/chiều cao đã cung cấp (Không dùng dữ liệu giả định).
    3. Trình bày dạng Bảng Markdown.
    """
    text = call_gemini_sdk(prompt)
    save_result_for_web(text)

def get_events(cursor):
    try:
        payload = { "jsonrpc": "2.0", "id": 1, "method": "suix_queryEvents", "params": [{ "MoveEventType": FULL_EVENT_TYPE }, cursor, 1, False] }
        return requests.post(RPC_URL, json=payload, timeout=5).json()
    except: return None

def main():
    print(f"--- SUI NUTRITION AI (ABSOLUTE PATH FIX) ---")
    print(f"📂 Thư mục gốc: {BASE_DIR}")
    save_result_for_web("Hệ thống sẵn sàng.", status="init")
    next_cursor = None
    try:
        payload = { "jsonrpc": "2.0", "id": 1, "method": "suix_queryEvents", "params": [{ "MoveEventType": FULL_EVENT_TYPE }, None, 1, True] }
        data = requests.post(RPC_URL, json=payload).json()
        if 'result' in data and data['result']['data']: next_cursor = data['result']['nextCursor'] 
    except: pass
    print("✨ ĐANG LẮNG NGHE BLOCKCHAIN SUI...")
    while True:
        try:
            data = get_events(next_cursor)
            if data and 'result' in data:
                for event in data['result']['data']:
                    srv_type = str(event['parsedJson']['service_type'])
                    print(f"\n🔔 [GIAO DỊCH] Dịch vụ: {srv_type}")
                    if srv_type == "1": analyze_food()
                    elif srv_type == "2": generate_menu()
                if data['result']['nextCursor']: next_cursor = data['result']['nextCursor']
        except: pass
        time.sleep(1)

if __name__ == "__main__":
    main()