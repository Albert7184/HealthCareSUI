import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file upload" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Đường dẫn trỏ thẳng vào thư mục backend ngang hàng với frontend
    const uploadDir = path.resolve(process.cwd(), "..", "backend");

    // Đảm bảo thư mục backend tồn tại (đề phòng lỗi path)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Quyết định tên file lưu dựa trên loại file gửi lên
    let fileName = "";
    if (file.type.includes("image")) {
      fileName = "user_upload.jpg"; // Luôn lưu là .jpg để Python dễ đọc
    } else if (file.name === "user_info.json" || file.type.includes("json")) {
      fileName = "user_info.json";
    } else {
      fileName = file.name;
    }

    const filePath = path.join(uploadDir, fileName);

    // Ghi file (Sử dụng ghi đè hoàn toàn để Backend nhận diện file mới nhất)
    fs.writeFileSync(filePath, buffer);

    console.log(`✅ [Frontend API] Đã lưu file: ${fileName} vào ${uploadDir}`);

    return NextResponse.json({ 
      status: "success", 
      message: "File đã được chuyển đến Backend",
      fileName 
    });
  } catch (e) {
    console.error("❌ Lỗi Upload API:", e);
    return NextResponse.json({ error: "Lỗi hệ thống khi lưu file" }, { status: 500 });
  }
}