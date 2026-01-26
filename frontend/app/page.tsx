"use client";

import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@mysten/dapp-kit/dist/index.css";
import { useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState("giam_can"); 

  const uploadFileToServer = async (fileToUpload: File) => {
    const formData = new FormData();
    formData.append("file", fileToUpload);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) return true;
    } catch (e) { console.error(e); }
    return false;
  };

  const pollForResults = () => {
    setIsAnalyzing(true);
    const startTime = Date.now();
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/ai_result.json?t=' + Date.now());
        const data = await res.json();
        if (data.status === "success" && data.text && (Date.now() / 1000 - data.timestamp) < 30) {
          setAiResult(data.text);
          setStatus("✅ AI Đã Xử Lý Xong!");
          setIsAnalyzing(false);
          clearInterval(interval);
        }
      } catch (e) {}
      if (Date.now() - startTime > 90000) { 
        clearInterval(interval);
        setIsAnalyzing(false);
        setStatus("⚠️ Hết thời gian chờ server.");
      }
    }, 2000);
  };

  const handlePayment = async (serviceType: number) => {
    if (!account) return;
    
    if (serviceType === 1) {
      if (!selectedFile) {
        alert("📸 Vui lòng chọn ảnh món ăn trước!");
        return;
      }
      setStatus("📤 Đang upload ảnh vệ tinh...");
      const success = await uploadFileToServer(selectedFile);
      if (!success) return setStatus("❌ Lỗi đường truyền ảnh.");
    }

    if (serviceType === 2) {
      if (!height || !weight) {
        alert("📝 Vui lòng nhập số đo cơ thể!");
        return;
      }
      setStatus("📡 Đang mã hóa hồ sơ sức khỏe...");
      const infoData = JSON.stringify({ height, weight, goal });
      const blob = new Blob([infoData], { type: "application/json" });
      const infoFile = new File([blob], "user_info.json"); 
      const success = await uploadFileToServer(infoFile);
      if (!success) return setStatus("❌ Lỗi gửi hồ sơ.");
    }

    setAiResult(null); 
    setStatus("💎 Đang xác thực trên Blockchain...");

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [10000000]); 

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
          console.log("Tx Digest:", result.digest);
          if (serviceType === 1) setStatus("🤖 AI đang quét dữ liệu món ăn...");
          else setStatus("🧬 AI đang tổng hợp phác đồ dinh dưỡng...");
          pollForResults();
        },
        onError: (err) => setStatus("❌ Giao dịch thất bại: " + err.message),
      },
    );
  };

  return (
    // 🌌 BACKGROUND: Gradient tím than đậm chất vũ trụ
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-purple-950 to-black text-white flex flex-col items-center p-4 font-sans">
      
      {/* 🌟 HEADER */}
      <div className="w-full max-w-6xl flex justify-between items-center py-6 mb-10 border-b border-white/10">
         <div className="flex items-center gap-3">
            <span className="text-4xl">🥗</span>
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Sui-Nutrition AI</h1>
                <p className="text-xs text-blue-200 tracking-widest uppercase">Decentralized Health Intelligence</p>
            </div>
         </div>
         <div className="scale-110"><ConnectButton /></div>
      </div>

      {!account ? (
        <div className="flex flex-col items-center justify-center h-96 text-center animate-fade-in-up">
            <div className="text-6xl mb-6">🔒</div>
            <h2 className="text-3xl font-bold text-white mb-4">Kết nối Ví để bắt đầu</h2>
            <p className="text-gray-400 max-w-md">Sử dụng công nghệ Blockchain và AI để phân tích dinh dưỡng chuẩn xác nhất.</p>
        </div>
      ) : (
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 👈 CỘT TRÁI: DỊCH VỤ (Chiếm 4 phần) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* CARD 1: FOOD SCANNER */}
            <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-blue-500/20">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition text-4xl">📸</div>
              <h2 className="text-xl font-bold text-blue-300 mb-2 flex items-center gap-2">
                AI Food Scanner
              </h2>
              <p className="text-gray-400 text-sm mb-4">Upload ảnh để tính Calories & Macro siêu tốc.</p>
              
              <div className="relative mb-4">
                  <input 
                    type="file" accept="image/*"
                    onChange={(e) => { if (e.target.files) setSelectedFile(e.target.files[0]); }}
                    className="block w-full text-sm text-slate-300
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-xs file:font-semibold
                      file:bg-blue-600 file:text-white
                      hover:file:bg-blue-500 cursor-pointer bg-black/20 rounded-lg p-2 border border-white/5"
                  />
              </div>
              
              <div className="flex justify-between items-center mt-4">
                  <span className="text-yellow-400 font-mono text-sm">💰 0.01 SUI</span>
                  <button 
                    onClick={() => handlePayment(1)} disabled={isAnalyzing}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full font-bold shadow-lg shadow-blue-900/50 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? "Processing..." : "SCAN NGAY"}
                  </button>
              </div>
            </div>

            {/* CARD 2: DIET PLAN */}
            <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl hover:border-green-500/50 transition-all duration-300 shadow-lg hover:shadow-green-500/20">
               <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition text-4xl">📅</div>
              <h2 className="text-xl font-bold text-green-300 mb-2">Diet Plan NFT</h2>
              <p className="text-gray-400 text-sm mb-4">Lên thực đơn cá nhân hóa 7 ngày.</p>
              
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-bold">Chiều cao</label>
                    <div className="relative">
                        <input type="number" placeholder="170" value={height} onChange={(e)=>setHeight(e.target.value)} 
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-green-500 transition text-sm text-center" />
                        <span className="absolute right-3 top-2 text-xs text-gray-500">cm</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-bold">Cân nặng</label>
                    <div className="relative">
                        <input type="number" placeholder="65" value={weight} onChange={(e)=>setWeight(e.target.value)} 
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-green-500 transition text-sm text-center" />
                        <span className="absolute right-3 top-2 text-xs text-gray-500">kg</span>
                    </div>
                  </div>
                </div>
                
                <div>
                   <label className="text-xs text-gray-500 uppercase font-bold">Mục tiêu</label>
                   <select value={goal} onChange={(e)=>setGoal(e.target.value)} 
                        className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-green-500 transition">
                      <option value="giam_can">🔥 Giảm cân (Lose Weight)</option>
                      <option value="tang_can">💪 Tăng cơ (Gain Muscle)</option>
                      <option value="giu_can">🧘 Giữ dáng (Maintain)</option>
                   </select>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                  <span className="text-yellow-400 font-mono text-sm">💰 0.01 SUI</span>
                  <button 
                    onClick={() => handlePayment(2)} disabled={isAnalyzing}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full font-bold shadow-lg shadow-green-900/50 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? "Writing..." : "MUA MENU"}
                  </button>
              </div>
            </div>

          </div>

          {/* 👉 CỘT PHẢI: KẾT QUẢ AI (Chiếm 8 phần) */}
          <div className="lg:col-span-8 flex flex-col gap-4 h-full">
             
             {/* THANH TRẠNG THÁI */}
             {status && (
                <div className={`w-full p-3 rounded-xl border flex items-center gap-3 animate-pulse
                    ${status.includes("❌") ? "bg-red-900/20 border-red-500/50 text-red-300" 
                    : status.includes("✅") ? "bg-green-900/20 border-green-500/50 text-green-300" 
                    : "bg-blue-900/20 border-blue-500/50 text-blue-300"}`}>
                    <span className="text-lg">{status.includes("✅") ? "🎉" : "🤖"}</span>
                    <span className="font-mono text-sm">{status}</span>
                </div>
             )}

             {/* MÀN HÌNH KẾT QUẢ */}
             <div className="flex-1 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-8 shadow-2xl overflow-hidden relative min-h-[500px]">
                {/* Trang trí nền */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                
                {!aiResult ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/20">
                        <div className="text-6xl mb-4 animate-bounce">🥗</div>
                        <p className="uppercase tracking-widest text-sm">Chưa có dữ liệu phân tích</p>
                        <p className="text-xs mt-2">Vui lòng chọn dịch vụ bên trái</p>
                    </div>
                ) : (
                    <div className="relative z-10 animate-fade-in">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
                            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-300 uppercase tracking-wide">
                                Kết Quả Phân Tích
                            </h3>
                        </div>
                        
                        {/* Nội dung Markdown */}
                        <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-blue-300 prose-strong:text-white max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResult}</ReactMarkdown>
                        </div>

                        {/* Footer của Report */}
                        <div className="mt-8 pt-4 border-t border-white/5 flex justify-between text-xs text-gray-500 font-mono">
                            <span>Powered by Gemini 2.0 Flash</span>
                            <span>{new Date().toLocaleString()}</span>
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