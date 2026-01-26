import time
import requests
import os
import base64
import json 
import random

# ==========================================
# 🏭 CẤU HÌNH INDUSTRIAL GRADE (3 KEY ROTATION)
# ==========================================
# Sử dụng 3 Key luân phiên để đảm bảo hệ thống luôn sống 24/7
API_KEYS = [
    "AIzaSyDbQlz5fZqxYZ7J3XL02k_T6Bw53enDkkA", 
    "AIzaSyBA8_toqXPq_lk5it5SDz6ABepru4SBMBM", 
    "AIzaSyBZMs--zNbbCKIAwzpLvUn_cUSu0xKh47E"
]

# Sử dụng Gemini 1.5 Flash: Cân bằng hoàn hảo giữa IQ và Tốc độ
PRIMARY_MODEL = "gemini-1.5-flash"
BACKUP_MODEL = "gemini-1.5-flash-latest"

# Cấu hình SUI Blockchain
PACKAGE_ID = "0x260ba0cff26a1e8b46039504bcf88b918eade66b87d804bfe0c0f67423f18029"
MODULE_NAME = "payment"
EVENT_NAME = "PaymentReceived"
FULL_EVENT_TYPE = f"{PACKAGE_ID}::{MODULE_NAME}::{EVENT_NAME}"
RPC_URL = "https://fullnode.testnet.sui.io:443"

current_key_index = 0

def get_active_key():
    global current_key_index
    return API_KEYS[current_key_index]

def switch_key():
    """Tự động đổi Key khi gặp sự cố mạng hoặc Rate Limit"""
    global current_key_index
    current_key_index = (current_key_index + 1) % len(API_KEYS)
    print(f"   ♻️ Hệ thống tự động chuyển sang API Key dự phòng #{current_key_index + 1}")

def save_result_for_web(text):
    try:
        output_path = "../frontend/public/ai_result.json"
        data = { "status": "success", "text": text, "timestamp": time.time() }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        print(f"   ✅ [DONE] Kết quả phân tích đã được gửi sang Web ({round(time.time() % 60, 2)}s)")
    except Exception as e:
        print(f"❌ [ERROR] Lỗi ghi file: {e}")

def call_gemini_api_professional(payload_contents, max_tokens=1000):
    """Hàm gọi AI chuẩn công nghiệp với cơ chế Retry thông minh"""
    
    # Cấu hình Generation: Giảm temperature để AI trả lời chính xác, ít "chém gió"
    generation_config = {
        "temperature": 0.4, 
        "topP": 0.95,
        "topK": 64,
        "maxOutputTokens": max_tokens,
    }
    
    # Tắt Safety Settings để không bị chặn nhầm khi phân tích hình ảnh đồ ăn
    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
    ]

    payload = {
        "contents": payload_contents,
        "generationConfig": generation_config,
        "safetySettings": safety_settings
    }

    # Cơ chế thử lại (Retry Mechanism) - Thử tối đa 3 lần với 3 Key khác nhau
    for attempt in range(3):
        active_key = get_active_key()
        headers = {'Content-Type': 'application/json'}
        
        try:
            # Timeout 20s là chuẩn cho xử lý ảnh phân giải cao
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{PRIMARY_MODEL}:generateContent?key={active_key}"
            response = requests.post(url, headers=headers, json=payload, timeout=20)
            
            # Fallback: Nếu model chính lỗi 404/503, thử model backup ngay lập tức
            if response.status_code in [404, 503]:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{BACKUP_MODEL}:generateContent?key={active_key}"
                response = requests.post(url, headers=headers, json=payload, timeout=20)

            if response.status_code == 200:
                result = response.json()
                if 'candidates' in result and result['candidates']:
                    return result['candidates'][0]['content']['parts'][0]['text']
            
            # Nếu gặp lỗi Rate Limit (429), đổi key và thử lại ngay
            elif response.status_code == 429:
                print(f"   ⚠️ Key hiện tại đang bận. Đang chuyển luồng...")
                switch_key()
                continue
            
            else:
                print(f"   ⚠️ Lỗi API: {response.status_code}. Đang thử lại...")
                switch_key()
                
        except Exception as e:
            print(f"   ⚠️ Lỗi kết nối: {str(e)[:50]}...")
            switch_key()
            
    return "❌ Hệ thống đang quá tải. Vui lòng thử lại sau giây lát."

# ==========================================
# 🥗 TÍNH NĂNG 1: CHUYÊN GIA PHÂN TÍCH ẨM THỰC
# ==========================================
def analyze_food_image():
    if not os.path.exists("user_upload.jpg"): return
    print(f"   🔍 Đang khởi động Vision AI để phân tích món ăn...")
    
    try:
        with open("user_upload.jpg", "rb") as f: img_data = base64.b64encode(f.read()).decode('utf-8')
        
        # PROMPT KỸ THUẬT (ENGINEERED PROMPT)
        # Yêu cầu AI đóng vai chuyên gia, trả về cấu trúc Markdown rõ ràng
        prompt_text = (
            "Bạn là một chuyên gia dinh dưỡng và ẩm thực AI (AI Nutritionist). "
            "Hãy phân tích bức ảnh món ăn này một cách chuyên nghiệp:\n\n"
            "1. **Xác định tên món ăn:** (Tên tiếng Việt và tên tiếng Anh nếu có).\n"
            "2. **Phân tích thành phần:** Liệt kê các nguyên liệu chính và cách chế biến phỏng đoán.\n"
            "3. **Bảng giá trị dinh dưỡng (Ước tính cho 1 khẩu phần):**\n"
            "   - Tạo bảng Markdown gồm: Calories, Protein, Carbs, Fat.\n"
            "4. **Lời khuyên sức khỏe:** Đưa ra 1 lời khuyên ngắn gọn dựa trên thành phần dinh dưỡng.\n\n"
            "Trình bày ngắn gọn, súc tích, chuyên nghiệp."
        )
        
        payload_contents = [{
            "parts": [
                {"text": prompt_text},
                { "inline_data": { "mime_type": "image/jpeg", "data": img_data } }
            ]
        }]
        
        text = call_gemini_api_professional(payload_contents, max_tokens=1200)
        if text: save_result_for_web(text)
        
    except Exception as e:
        print(f"❌ Lỗi xử lý ảnh: {e}")

# ==========================================
# 📅 TÍNH NĂNG 2: LẬP TRÌNH VIÊN DINH DƯỠNG (DIET PLAN)
# ==========================================
def generate_diet_plan():
    print(f"   🥦 Đang tính toán Calories & Lập thực đơn cá nhân hóa...")
    user_info = {"height": "170", "weight": "65", "goal": "Cân bằng"}
    try:
        if os.path.exists("user_info.json"):
            with open("user_info.json", "r", encoding="utf-8") as f:
                data = json.loads(f.read())
                if data: user_info.update(data)
    except: pass

    # PROMPT KỸ THUẬT CHO MENU
    prompt = (
        f"Khách hàng có chỉ số: Cao {user_info.get('height')}cm, Nặng {user_info.get('weight')}kg.\n"
        f"Mục tiêu: {user_info.get('goal')}.\n\n"
        "Hãy thiết kế thực đơn 7 ngày (Thứ 2 - Chủ Nhật) phù hợp với thể trạng và văn hóa ăn uống Việt Nam.\n"
        "**Yêu cầu định dạng:**\n"
        "- Trả về dưới dạng **Bảng Markdown (Table)**.\n"
        "- Các cột: Ngày | Sáng | Trưa | Tối | Bữa phụ (nếu cần).\n"
        "- Món ăn phải cụ thể, heo thì (Healthy) nhưng dễ nấu."
    )
    
    text = call_gemini_api_professional([{ "parts": [{"text": prompt}] }], max_tokens=2000)
    if text: save_result_for_web(text)

# ==========================================
# CƠ CHẾ LẮNG NGHE SỰ KIỆN (EVENT LISTENER)
# ==========================================
def get_events(cursor, limit=1):
    try:
        payload = { "jsonrpc": "2.0", "id": 1, "method": "suix_queryEvents", "params": [{ "MoveEventType": FULL_EVENT_TYPE }, cursor, limit, False] }
        # Timeout ngắn để vòng lặp quét nhanh hơn
        return requests.post(RPC_URL, json=payload, timeout=5).json()
    except: return None

def main():
    print(f"--- SUI NUTRITION AI: PROFESSIONAL MODE ---")
    print(f"⚡ System Status: ONLINE | Keys: {len(API_KEYS)} | Model: {PRIMARY_MODEL}")
    
    # Reset con trỏ sự kiện để tránh xử lý lại đơn cũ
    next_cursor = None
    try:
        payload = { "jsonrpc": "2.0", "id": 1, "method": "suix_queryEvents", "params": [{ "MoveEventType": FULL_EVENT_TYPE }, None, 1, True] }
        data = requests.post(RPC_URL, json=payload, timeout=5).json()
        if data and 'result' in data and len(data['result']['data']) > 0:
             next_cursor = data['result']['nextCursor'] 
    except: pass
    
    print("✨ SẴN SÀNG TIẾP NHẬN YÊU CẦU...")
    
    # Xóa kết quả cũ trên web
    try:
        with open("../frontend/public/ai_result.json", "w") as f: f.write("{}")
    except: pass

    while True:
        data = get_events(next_cursor)
        if data and 'result' in data:
            result = data['result']
            if result['data']:
                for event in result['data']:
                    parsed = event['parsedJson']
                    print(f"🔔 [NEW ORDER] Phát hiện giao dịch loại: {parsed['service_type']}")
                    
                    if str(parsed['service_type']) == "1": analyze_food_image()
                    elif str(parsed['service_type']) == "2": generate_diet_plan()
                    
            if result['nextCursor']: next_cursor = result['nextCursor']
        
        # Polling interval tối ưu: 1 giây
        time.sleep(1)

if __name__ == "__main__":
    main()