import { NextResponse } from 'next/server';
import fs from 'fs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text } = body; // Lấy tên món ăn từ Frontend gửi xuống

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // 🔥 FIX CỨNG ĐƯỜNG DẪN (Để chắc chắn ghi đúng chỗ Backend đọc)
    const filePath = "D:\\Sui-Nutrition AI\\backend\\food_name.txt";

    console.log("📝 API save-text đang chạy! Ghi món ăn vào:", filePath);

    // Ghi tên món ăn vào file
    fs.writeFileSync(filePath, text, 'utf8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Lỗi API Save Text:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}