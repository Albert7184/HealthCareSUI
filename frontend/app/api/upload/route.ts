import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.resolve(process.cwd(), "../backend");

    // QUAN TRỌNG: Kiểm tra tên file gốc để quyết định tên file lưu
    let fileName = "user_upload.jpg"; // Mặc định là ảnh
    if (file.name === "user_info.json") {
      fileName = "user_info.json"; // Nếu là file thông tin
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ status: "success", fileName });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}