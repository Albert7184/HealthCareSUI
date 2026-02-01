"use client";

import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@mysten/dapp-kit/dist/index.css";
import { useState, useMemo } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- CẤU HÌNH ---
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl("testnet") },
});
const queryClient = new QueryClient();

const PACKAGE_ID = "0x260ba0cff26a1e8b46039504bcf88b918eade66b87d804bfe0c0f67423f18029"; 
const MODULE_NAME = "payment";
const FUNCTION_NAME = "pay_for_service";
const RECIPIENT_ADDRESS = "0x5d341f3c924749d0823139c1af008cb8768f299da032cc5ab835029ba9f6ff4e"; 

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider>
          <MainInterface />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

function MainInterface() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [status, setStatus] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // State cho File ảnh
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // State cho Tên món ăn
  const [foodName, setFoodName] = useState("");

  // State cho chỉ số cơ thể
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState("65");
  const [goal, setGoal] = useState("tang_co"); 

  // --- TÍNH BMI TỰ ĐỘNG ---
  const bmiInfo = useMemo(() => {
    const h = parseFloat(height) / 100;
    const w = parseFloat(weight);
    if (!h || !w) return { value: 0, status: "Chưa xác định", color: "text-gray-400" };
    
    const bmi = w / (h * h);
    let status = "";
    let color = "";
    let advice = "";

    if (bmi < 18.5) { 
        status = "Thiếu cân"; color = "text-yellow-400"; advice = "Cần tăng cân";
    } else if (bmi < 24.9) { 
        status = "Bình thường"; color = "text-green-400"; advice = "Giữ dáng";
    } else if (bmi < 29.9) { 
        status = "Thừa cân"; color = "text-orange-400"; advice = "Cần giảm cân";
    } else { 
        status = "Béo phì"; color = "text-red-500"; advice = "Cần giảm cân gấp";
    }

    return { value: bmi.toFixed(1), status, color, advice };
  }, [height, weight]);

  // --- LOGIC UPLOAD ẢNH ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setFoodName("");
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
        await fetch("/api/upload", { method: "POST", body: formData });
    } catch (e) { console.error("Upload error", e); }
  };

  // --- LOGIC GỬI TEXT ---
  const saveText = async (text: string) => {
    try {
      await fetch("/api/save-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch (e) { console.error("Text save error", e); }
  };

  // --- MỚI: LOGIC GỬI THÔNG TIN USER (CHIỀU CAO, CÂN NẶNG) ---
  const saveUserInfo = async () => {
    let goalText = "Duy trì sức khỏe";
    if (goal === "tang_co") goalText = "Tăng cơ bắp (Muscle Building)";
    else if (goal === "giam_can") goalText = "Giảm mỡ (Fat Loss) - Ưu tiên thâm hụt Calo";
    else if (goal === "giu_dang") goalText = "Giữ dáng (Maintain Weight)";

    const userInfoString = `
      - Chiều cao: ${height} cm
      - Cân nặng: ${weight} kg
      - Chỉ số BMI: ${bmiInfo.value} (${bmiInfo.status})
      - Mục tiêu: ${goalText}
    `;

    try {
      await fetch("/api/save-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ info: userInfoString }),
      });
      console.log("Đã gửi thông tin User xuống Backend!");
    } catch (e) { console.error("Lỗi lưu info:", e); }
  };

  // --- LOGIC POLLING ---
  const pollResult = () => {
    setIsAnalyzing(true);
    setStatus("🔄 Backend AI đang phân tích dữ liệu...");
    
    const clickTime = Date.now() / 1000;

    const interval = setInterval(async () => {
        try {
            const res = await fetch(`/ai_result.json?t=${Date.now()}&r=${Math.random()}`);
            
            if (res.ok) {
                const data = await res.json();
                
                if (data.timestamp && data.timestamp > (clickTime - 5)) {
                    setAiResult(data.text);
                    setStatus("✅ Xử lý thành công!");
                    setIsAnalyzing(false);
                    clearInterval(interval);
                }
            }
        } catch (e) { 
            console.log("Đang đợi file mới..."); 
        }
    }, 1000); 
  };

  const handlePayment = async (serviceType: number) => {
    if (!account) return;
    
    // --- DỊCH VỤ 1: SCAN ẢNH/TEXT ---
    if (serviceType === 1) {
        if (!selectedFile && !foodName.trim()) {
            return alert("Vui lòng chọn ảnh HOẶC nhập tên món ăn!");
        }
        
        if (selectedFile) {
            setStatus("📤 Đang gửi ảnh lên Server...");
            await uploadFile(selectedFile);
        } else if (foodName.trim()) {
            setStatus("📝 Đang gửi tên món ăn...");
            await saveText(foodName);
        }
    }

    // --- DỊCH VỤ 2: LÊN MENU (MỚI CẬP NHẬT) ---
    if (serviceType === 2) {
        setStatus("📝 Đang cập nhật chỉ số cơ thể...");
        await saveUserInfo(); // <--- QUAN TRỌNG: Gửi thông tin trước khi thanh toán
    }

    setStatus("💎 Đang thanh toán qua ví Sui...");
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [10000000]); // 0.01 SUI

    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::${FUNCTION_NAME}`,
      arguments: [
        coin,
        tx.pure.address(RECIPIENT_ADDRESS),
        tx.pure.u8(serviceType),
        tx.pure.u64(Date.now())
      ],
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result) => {
          console.log("Digest:", result.digest);
          setAiResult(null); 
          pollResult(); 
        },
        onError: (err) => setStatus("❌ Lỗi: " + err.message),
      },
    );
  };

  return (
    // 🌌 BACKGROUND
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center p-6 font-sans selection:bg-blue-500 selection:text-white">
      
      {/* 🌟 HEADER */}
      <nav className="w-full max-w-7xl flex justify-between items-center py-6 mb-12 border-b border-white/10">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30">
                🧬
            </div>
            <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    Sui-Nutrition AI
                </h1>
                <p className="text-[10px] text-gray-400 tracking-[0.2em] uppercase font-semibold">Core Engine v2.0</p>
            </div>
         </div>
         <div className="hover:scale-105 transition-transform"><ConnectButton /></div>
      </nav>

      {!account ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
            <div className="text-8xl animate-bounce">🔒</div>
            <h2 className="text-4xl font-bold text-white">Kết nối Ví để truy cập hệ thống</h2>
            <p className="text-gray-400 max-w-md text-lg">Phân tích dinh dưỡng chuẩn xác bằng AI kết hợp bảo mật Blockchain.</p>
        </div>
      ) : (
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 👈 CỘT TRÁI: ĐIỀU KHIỂN */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* CARD 1: FOOD SCANNER */}
            <div className="bg-[#111] border border-white/10 p-6 rounded-3xl shadow-xl hover:border-blue-500/30 transition-all group">
              <div className="flex items-center gap-3 mb-4">
                  <span className="p-2 bg-blue-500/10 rounded-lg text-2xl group-hover:scale-110 transition">📸</span>
                  <h3 className="text-xl font-bold text-gray-200">AI Food Scanner</h3>
              </div>
              
              {/* Preview Ảnh */}
              <div className="relative w-full h-48 bg-black/50 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center overflow-hidden mb-4 group-hover:border-blue-500/50 transition">
                  {previewUrl ? (
                      <>
                        <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setSelectedFile(null);
                                setPreviewUrl(null);
                            }}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full text-xs shadow-md z-10 hover:bg-red-500"
                        >
                            ✕
                        </button>
                      </>
                  ) : (
                      <div className="text-gray-500 text-sm flex flex-col items-center">
                          <span className="text-2xl mb-2">☁️</span>
                          <span>Chưa chọn ảnh</span>
                      </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>

              {/* Ô NHẬP TEXT */}
              <div className="mb-4 w-full">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-px bg-gray-800 flex-1"></div>
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Hoặc nhập tên</span>
                    <div className="h-px bg-gray-800 flex-1"></div>
                </div>
                
                <input
                    type="text"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="Ví dụ: Bún bò huế, Cơm tấm..."
                    disabled={!!selectedFile} 
                    className={`w-full bg-black/40 border ${selectedFile ? 'border-gray-800 text-gray-600 cursor-not-allowed' : 'border-gray-600 text-white focus:border-blue-500'} rounded-xl px-4 py-3 outline-none transition-all placeholder-gray-600 text-sm font-medium`}
                />
                {selectedFile && (
                    <p className="text-[10px] text-yellow-500/80 mt-1 ml-1 font-mono">* Đã chọn ảnh (Ưu tiên xử lý ảnh)</p>
                )}
              </div>

              <button 
                onClick={() => handlePayment(1)} 
                disabled={isAnalyzing}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-blue-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAnalyzing ? "⏳ Đang quét..." : "⚡ SCAN (0.01 SUI)"}
              </button>
            </div>

            {/* CARD 2: DIET PLANNER + BMI */}
            <div className="bg-[#111] border border-white/10 p-6 rounded-3xl shadow-xl hover:border-green-500/30 transition-all group">
               <div className="flex items-center gap-3 mb-4">
                  <span className="p-2 bg-green-500/10 rounded-lg text-2xl group-hover:scale-110 transition">🥗</span>
                  <h3 className="text-xl font-bold text-gray-200">Smart Diet & BMI</h3>
              </div>

              {/* Input Chiều cao / Cân nặng */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                      <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Chiều cao</label>
                      <div className="flex items-end gap-1">
                          <input type="number" value={height} onChange={e=>setHeight(e.target.value)} className="w-full bg-transparent text-xl font-bold focus:outline-none text-white border-b border-gray-700 focus:border-green-500 transition" />
                          <span className="text-xs text-gray-500 mb-1">cm</span>
                      </div>
                  </div>
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                      <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Cân nặng</label>
                      <div className="flex items-end gap-1">
                          <input type="number" value={weight} onChange={e=>setWeight(e.target.value)} className="w-full bg-transparent text-xl font-bold focus:outline-none text-white border-b border-gray-700 focus:border-green-500 transition" />
                          <span className="text-xs text-gray-500 mb-1">kg</span>
                      </div>
                  </div>
              </div>

              {/* Màn hình hiển thị BMI */}
              <div className="mb-4 p-4 bg-white/5 rounded-xl flex items-center justify-between border border-white/5">
                  <div>
                      <div className="text-xs text-gray-400 uppercase">Chỉ số BMI</div>
                      <div className={`text-2xl font-black ${bmiInfo.color}`}>{bmiInfo.value}</div>
                  </div>
                  <div className="text-right">
                      <div className={`text-sm font-bold ${bmiInfo.color}`}>{bmiInfo.status}</div>
                      <div className="text-xs text-gray-500">Mục tiêu: {bmiInfo.advice}</div>
                  </div>
              </div>

              {/* Chọn Mục tiêu */}
              <div className="mb-4">
                  <label className="text-xs text-gray-500 font-bold uppercase block mb-2">Mục tiêu tuần này</label>
                  <select value={goal} onChange={e=>setGoal(e.target.value)} className="w-full bg-black/30 border border-gray-700 text-gray-200 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5">
                    <option value="tang_co">💪 Tăng cơ bắp (Muscle)</option>
                    <option value="giam_can">🔥 Giảm mỡ (Fat Loss)</option>
                    <option value="giu_dang">🧘 Duy trì (Maintain)</option>
                  </select>
              </div>

              <button 
                onClick={() => handlePayment(2)} 
                disabled={isAnalyzing}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl font-bold text-white shadow-lg shadow-green-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAnalyzing ? "⏳ Đang tính toán..." : "📅 LÊN MENU (0.01 SUI)"}
              </button>
            </div>
          </div>

          {/* 👉 CỘT PHẢI: KẾT QUẢ HIỂN THỊ */}
          <div className="lg:col-span-8 flex flex-col gap-4">
              
             {/* Status Bar */}
             {status && (
                <div className={`w-full p-4 rounded-xl border backdrop-blur-md flex items-center gap-3 animate-fade-in
                    ${status.includes("❌") ? "bg-red-500/10 border-red-500/30 text-red-400" 
                    : status.includes("✅") ? "bg-green-500/10 border-green-500/30 text-green-400" 
                    : "bg-blue-500/10 border-blue-500/30 text-blue-400"}`}>
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                    <span className="font-mono text-sm font-bold tracking-wide">{status}</span>
                </div>
             )}

             {/* Result Container */}
             <div className="flex-1 bg-[#111] rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden min-h-[600px]">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                
                {!aiResult ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4">
                        <div className="text-7xl opacity-20 animate-pulse grayscale">🥗</div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-500">Chờ dữ liệu phân tích...</h3>
                            <p className="text-sm">Vui lòng Scan món ăn hoặc Mua thực đơn</p>
                        </div>
                    </div>
                ) : (
                    <div className="relative z-10 animate-slide-up">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
                            <span className="text-2xl">✨</span>
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">
                                Báo Cáo Dinh Dưỡng
                            </h2>
                        </div>
                        
                        {/* Markdown Content */}
                        <div className="prose prose-invert prose-lg max-w-none 
                            prose-headings:text-blue-300 prose-headings:font-bold 
                            prose-p:text-gray-300 prose-p:leading-relaxed
                            prose-strong:text-white prose-strong:font-extrabold
                            prose-ul:list-disc prose-li:marker:text-blue-500">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResult}</ReactMarkdown>
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-800 flex justify-between items-center text-xs text-gray-500 font-mono">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Verified by Gemini AI
                            </div>
                            <div>ID: {Date.now().toString().slice(-6)}</div>
                        </div>
                    </div>
                )}
             </div>
          </div>

        </div>
      )}
    </div>
  );
}