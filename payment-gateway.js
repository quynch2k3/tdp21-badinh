/**
 * PAYMENT GATEWAY MODULE - MOMO DIRECT API
 * STRATEGY: Client-Side with CORS Proxy
 * - Removes Google Apps Script dependency
 * - Uses local proxy (proxy.js) OR HTTPS proxy for CORS bypass
 * - Generates signature client-side using CryptoJS
 */

const PaymentGateway = (function () {

    // ============================================================
    // CONFIGURATION - PRODUCTION/SANDBOX TOGGLE
    // ============================================================
    const ENV = 'SANDBOX'; // 'PROD' or 'SANDBOX' - Use SANDBOX for test credentials

    const CONFIG = {
        // SANDBOX (TEST)
        SANDBOX: {
            PARTNER_CODE: "MOMO9LID20260123_TEST",
            ACCESS_KEY: "vveSdoaTZmBo09ks",
            SECRET_KEY: "zcSkh7dxPLyZXLurEVbZrTUYWz8IQIks",
            API_ENDPOINT: "https://test-payment.momo.vn/v2/gateway/api/create"
        },
        // PRODUCTION - Update with real keys from MoMo Business
        PROD: {
            PARTNER_CODE: "MOMO9LID20260123",
            ACCESS_KEY: "vveSdoaTZmBo09ks",
            SECRET_KEY: "zcSkh7dxPLyZXLurEVbZrTUYWz8IQIks",
            API_ENDPOINT: "https://payment.momo.vn/v2/gateway/api/create"
        }
    };

    // Select active config
    const ACTIVE_CONFIG = CONFIG[ENV];

    // CORS Proxy - Local Node.js proxy only (run: node proxy.js)
    const PROXY_URL = "http://localhost:3000";

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    function removeAccents(str) {
        return str.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d").replace(/Đ/g, "D")
            .replace(/[^a-zA-Z0-9 ]/g, "");
    }

    /**
     * Generate HMAC-SHA256 Signature using CryptoJS
     * Requires: <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
     */
    function generateSignature(rawData, secretKey) {
        if (typeof CryptoJS === 'undefined') {
            throw new Error("CryptoJS not loaded! Please include crypto-js library.");
        }
        return CryptoJS.HmacSHA256(rawData, secretKey).toString(CryptoJS.enc.Hex);
    }

    /**
     * Build MoMo Raw Signature String (strict alphabetical order)
     */
    function buildRawSignature(params) {
        return `accessKey=${params.accessKey}` +
            `&amount=${params.amount}` +
            `&extraData=${params.extraData}` +
            `&ipnUrl=${params.ipnUrl}` +
            `&orderId=${params.orderId}` +
            `&orderInfo=${params.orderInfo}` +
            `&partnerCode=${params.partnerCode}` +
            `&redirectUrl=${params.redirectUrl}` +
            `&requestId=${params.requestId}` +
            `&requestType=${params.requestType}`;
    }

    /**
     * Call MoMo API via local proxy
     */
    async function callMoMoAPI(momoPayload) {
        try {
            console.log(`[PaymentGateway] Calling MoMo via proxy: ${PROXY_URL}`);

            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(momoPayload)
            });

            const result = await response.json();
            console.log("[PaymentGateway] MoMo Response:", result);

            // Check MoMo result code (0 = success)
            if (result.resultCode === 0 && result.payUrl) {
                return { success: true, payUrl: result.payUrl, data: result };
            } else {
                // MoMo returned an error
                return {
                    success: false,
                    message: result.message || `MoMo Error Code: ${result.resultCode}`,
                    data: result
                };
            }

        } catch (e) {
            console.error(`[PaymentGateway] Proxy error:`, e.message);
            return {
                success: false,
                message: `Không thể kết nối proxy. Vui lòng chạy: node proxy.js\n\nLỗi: ${e.message}`
            };
        }
    }

    // ============================================================
    // PUBLIC API
    // ============================================================
    return {
        /**
         * Pay with MoMo - Direct API Call
         * @param {Object} payload - { code, amount, name }
         */
        payWithMoMo: async function (payload) {
            console.log("[PaymentGateway] Initiating MoMo Payment...", payload);

            try {
                // Validate CryptoJS
                if (typeof CryptoJS === 'undefined') {
                    alert("Lỗi hệ thống: Thư viện mã hóa chưa được tải. Vui lòng làm mới trang.");
                    throw new Error("CryptoJS not loaded!");
                }

                // Prepare Parameters
                const orderId = payload.code;
                const requestId = orderId; // Same as orderId for simplicity
                const amount = payload.amount.toString();
                const cleanName = removeAccents(payload.name);
                const orderInfo = "Ung ho quy TDP21: " + cleanName;
                const redirectUrl = window.location.href.split('?')[0] + "?id=" + (payload.fundId || ''); // Clean redirect
                const ipnUrl = redirectUrl; // For simple setup, IPN = Redirect
                const extraData = "";
                const requestType = "captureWallet";

                // Build Signature
                const signatureParams = {
                    accessKey: ACTIVE_CONFIG.ACCESS_KEY,
                    amount: amount,
                    extraData: extraData,
                    ipnUrl: ipnUrl,
                    orderId: orderId,
                    orderInfo: orderInfo,
                    partnerCode: ACTIVE_CONFIG.PARTNER_CODE,
                    redirectUrl: redirectUrl,
                    requestId: requestId,
                    requestType: requestType
                };

                const rawSignature = buildRawSignature(signatureParams);
                console.log("[PaymentGateway] Raw Signature:", rawSignature);

                const signature = generateSignature(rawSignature, ACTIVE_CONFIG.SECRET_KEY);
                console.log("[PaymentGateway] Signature:", signature);

                // MoMo Request Body
                const momoPayload = {
                    partnerCode: ACTIVE_CONFIG.PARTNER_CODE,
                    partnerName: "To Dan Pho 21",
                    storeId: "TDP21",
                    requestId: requestId,
                    amount: amount,
                    orderId: orderId,
                    orderInfo: orderInfo,
                    redirectUrl: redirectUrl,
                    ipnUrl: ipnUrl,
                    lang: "vi",
                    requestType: requestType,
                    autoCapture: true,
                    extraData: extraData,
                    signature: signature
                };

                console.log("[PaymentGateway] Calling MoMo API...", momoPayload);

                // Call API with CORS handling
                const result = await callMoMoAPI(momoPayload);

                if (result.success && result.payUrl) {
                    console.log("[PaymentGateway] Redirecting to MoMo:", result.payUrl);
                    window.location.href = result.payUrl;
                } else {
                    // Show error to user
                    const errorMsg = result.message || "Không thể kết nối MoMo. Vui lòng thử lại.";
                    console.error("[PaymentGateway] Error:", errorMsg);

                    // Fallback: Show QR Code
                    showQRCodeFallback(payload, orderId);
                }

            } catch (e) {
                console.error("[PaymentGateway] Exception:", e);
                alert("Lỗi kết nối thanh toán: " + e.message);
            }
        },

        /**
         * Get current config info
         */
        getConfigInfo: function () {
            return {
                mode: "DIRECT_API",
                environment: ENV,
                partnerCode: ACTIVE_CONFIG.PARTNER_CODE.substring(0, 10) + "..."
            };
        }
    };

    // ============================================================
    // FALLBACK: QR CODE (VietQR format)
    // ============================================================
    function showQRCodeFallback(payload, orderId) {
        // Generate VietQR compatible QR for manual scanning
        const bankId = "MB"; // Default bank
        const accNo = "0904568973"; // Update with actual account
        const content = `TDP21 ${orderId} ${removeAccents(payload.name)}`.toUpperCase();

        const qrUrl = `https://img.vietqr.io/image/${bankId}-${accNo}-compact2.png?amount=${payload.amount}&addInfo=${encodeURIComponent(content)}`;

        // Show in modal or inline
        const container = document.getElementById('donation-form-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <div style="margin-bottom:15px;">
                        <i class="fa-solid fa-triangle-exclamation" style="font-size:40px; color:#f59e0b;"></i>
                    </div>
                    <h3 style="color:#92400e; margin-bottom:10px;">MOMO TẠM THỜI KHÔNG KHẢ DỤNG</h3>
                    <p style="color:#666; font-size:14px; margin-bottom:20px;">Vui lòng quét mã QR dưới đây để chuyển khoản ngân hàng:</p>
                    
                    <img src="${qrUrl}" alt="QR Code" style="max-width:250px; border:2px solid #ddd; border-radius:12px; margin-bottom:15px;">
                    
                    <div style="background:#fff7ed; padding:15px; border-radius:8px; border:1px dashed #f97316; margin-bottom:20px;">
                        <div style="font-size:12px; color:#92400e; margin-bottom:5px;">Nội dung chuyển khoản</div>
                        <div style="font-weight:bold; color:#c2410c;">${content}</div>
                    </div>
                    
                    <button onclick="location.reload()" style="background:#3b82f6; color:white; border:none; padding:12px 25px; border-radius:8px; font-weight:bold; cursor:pointer;">
                        <i class="fa-solid fa-rotate-left"></i> THỬ LẠI
                    </button>
                </div>
            `;
        } else {
            alert("MoMo không khả dụng. Vui lòng liên hệ Admin.");
        }
    }

})();
