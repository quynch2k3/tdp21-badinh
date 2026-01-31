/**
 * PAYMENT GATEWAY MODULE - MOMO SERVERLESS
 * STRATEGY: Serverless via Google Apps Script (GAS)
 * - Removes local terminal dependency
 * - Bypasses CORS via GAS Proxy
 * - Secures Secret Key (hidden in GAS)
 */

const PaymentGateway = (function () {

    // ============================================================
    // CONFIGURATION
    // ============================================================
    // PASTE YOUR GAS WEB APP URL HERE AFTER DEPLOYMENT
    const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxnM2gxOLNCKWz3-aftQydWzUgvwtg8PCTlBZr7ExUoTVv1zCpxzOe8LpZHDhOkAHIueg/exec";

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    function removeAccents(str) {
        if (!str) return "";
        return str.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d").replace(/Đ/g, "D")
            .replace(/[^a-zA-Z0-9 ]/g, "");
    }

    /**
     * Call MoMo API via Google Apps Script Proxy
     */
    async function callProxyAPI(payload) {
        try {
            console.log(`[PaymentGateway] Calling MoMo via GAS: ${GAS_WEB_APP_URL}`);

            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log("[PaymentGateway] Response:", result);

            if (result.resultCode === 0 && result.payUrl) {
                return { success: true, payUrl: result.payUrl, data: result };
            } else {
                return {
                    success: false,
                    message: result.message || `Lỗi MoMo: ${result.resultCode}`,
                    data: result
                };
            }

        } catch (e) {
            console.error(`[PaymentGateway] GAS Error:`, e.message);
            return {
                success: false,
                message: "Không thể kết nối đến hệ thống thanh toán. Vui lòng kiểm tra lại cấu hình GAS_WEB_APP_URL."
            };
        }
    }

    // ============================================================
    // PUBLIC API
    // ============================================================
    return {
        /**
         * Pay with MoMo
         * @param {Object} payload - { code, amount, name, fundId }
         */
        payWithMoMo: async function (payload) {
            console.log("[PaymentGateway] Initiating MoMo Payment...", payload);

            try {
                // Validate Config
                if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes('...')) {
                    alert("Chưa cấu hình Google Apps Script URL. Vui lòng liên hệ Admin.");
                    return;
                }

                // Prepare Parameters for Proxy
                const orderId = payload.code;
                const cleanName = removeAccents(payload.name);
                const orderInfo = "Ung ho quy TDP21: " + cleanName;
                const redirectUrl = window.location.href.split('?')[0] + "?id=" + (payload.fundId || '') + "&orderId=" + orderId;

                const proxyPayload = {
                    orderId: orderId,
                    amount: payload.amount,
                    orderInfo: orderInfo,
                    redirectUrl: redirectUrl,
                    name: cleanName // For extra metadata
                };


                // Call API via POST (original method)
                const result = await callProxyAPI(proxyPayload);

                if (result.success && result.payUrl) {
                    console.log("[PaymentGateway] Redirecting to MoMo:", result.payUrl);
                    window.location.href = result.payUrl;
                } else {
                    console.error("[PaymentGateway] Error:", result.message);
                    showQRCodeFallback(proxyPayload, orderId);
                }

            } catch (e) {
                console.error("[PaymentGateway] Exception:", e);
                alert("Lỗi kết nối thanh toán: " + e.message);
            }
        },

        /**
         * Check if returning from MoMo
         */
        checkPaymentStatus: function () {
            const params = new URLSearchParams(window.location.search);
            const resultCode = params.get('resultCode');
            const orderId = params.get('orderId');

            if (resultCode !== null) {
                return {
                    isReturn: true,
                    success: resultCode === "0",
                    orderId: orderId,
                    message: params.get('message')
                };
            }
            return { isReturn: false };
        },

        getConfigInfo: function () {
            return {
                mode: "SERVERLESS",
                isConfigured: !GAS_WEB_APP_URL.includes('...')
            };
        }
    };

    // ============================================================
    // FALLBACK: QR CODE
    // ============================================================
    function showQRCodeFallback(payload, orderId) {
        const bankId = "MB";
        const accNo = "0904568973";
        const content = `TDP21 ${orderId} ${removeAccents(payload.name)}`.toUpperCase();
        const qrUrl = `https://img.vietqr.io/image/${bankId}-${accNo}-compact2.png?amount=${payload.amount}&addInfo=${encodeURIComponent(content)}`;

        const container = document.getElementById('donation-form-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <div style="margin-bottom:15px;">
                        <i class="fa-solid fa-triangle-exclamation" style="font-size:40px; color:#f59e0b;"></i>
                    </div>
                    <h3 style="color:#92400e; margin-bottom:10px;">PHƯƠNG THỨC TỰ ĐỘNG GIÁN ĐOẠN</h3>
                    <p style="color:#666; font-size:14px; margin-bottom:20px;">Quý khách vui lòng quét mã QR chuyển khoản thủ công:</p>
                    
                    <img src="${qrUrl}" alt="QR Code" style="max-width:250px; border:2px solid #ddd; border-radius:12px; margin-bottom:15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    
                    <div style="background:#fff7ed; padding:15px; border-radius:8px; border:1px dashed #f97316; margin-bottom:20px; text-align:left;">
                        <div style="font-size:12px; color:#92400e; margin-bottom:5px;">Nội dung chuyển khoản (Bắt buộc)</div>
                        <div style="font-weight:bold; color:#c2410c; font-family:monospace; background:#fff; padding:8px; border-radius:4px; border:1px solid #fed7aa;">${content}</div>
                    </div>
                    
                    <button onclick="location.reload()" style="background:#3b82f6; color:white; border:none; padding:12px 25px; border-radius:8px; font-weight:bold; cursor:pointer; width:100%;">
                        <i class="fa-solid fa-rotate-left"></i> QUAY LẠI
                    </button>
                </div>
            `;
        } else {
            alert("MoMo hiện chưa khả dụng. Vui lòng chuyển khoản thủ công theo thông tin trên trang.");
        }
    }

})();
