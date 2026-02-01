import { NextResponse } from 'next/server';
import fs from 'fs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { info } = body;

    // ĐƯỜNG DẪN CỨNG VÀO Ổ D CỦA BẠN
    const filePath = "D:\\Sui-Nutrition AI\\backend\\user_info.json";

    console.log("📝 API save-info đang chạy! Ghi vào:", filePath);

    fs.writeFileSync(filePath, info || "No info", 'utf8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Lỗi API Save Info:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}