module sui_fit::payment {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;

    // --- Cấu trúc sự kiện (Events) ---
    
    // Sự kiện này sẽ được Backend (Python) lắng nghe
    // Khi thấy sự kiện này, Backend sẽ lấy request_id để xử lý AI
    struct PaymentReceived has copy, drop {
        user: address,
        amount: u64,
        service_type: u8, // 1: Scan Food, 2: Diet Plan
        request_id: u64,  // ID định danh cho request này (timestamp hoặc random từ client)
    }

    // --- Hàm chính (Functions) ---

    // Hàm thanh toán dịch vụ
    // payment: Đồng xu SUI người dùng đưa vào
    // recipient: Địa chỉ ví Admin (Backend wallet) để nhận tiền
    // service_type: Loại dịch vụ muốn mua
    // request_id: ID unique từ frontend gửi xuống
    public entry fun pay_for_service(
        payment: Coin<SUI>, 
        recipient: address, 
        service_type: u8,
        request_id: u64,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&payment);
        let sender = tx_context::sender(ctx);

        // 1. Kiểm tra tiền (Ví dụ: tối thiểu 0.1 SUI ~ 100,000,000 MIST)
        // assert!(amount >= 100000000, 0); // Có thể mở comment nếu muốn ép min payment

        // 2. Chuyển tiền SUI cho Admin (recipient)
        transfer::public_transfer(payment, recipient);

        // 3. Bắn pháo hiệu (Event) cho Backend biết
        event::emit(PaymentReceived {
            user: sender,
            amount: amount,
            service_type: service_type,
            request_id: request_id
        });
    }
}