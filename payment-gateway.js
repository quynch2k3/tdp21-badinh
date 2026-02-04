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
    const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycby6jXE4KnXqf2-xk2j9TkneGmNE470on3HYMAWNb-r-ESQMmD1VZTxKGp7zAuAMVantTw/exec";

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

            if ((result.resultCode === 0 && result.payUrl) || (result.resultCode === "00" && result.checkoutUrl) || (result.type === 'FORM_SUBMIT')) {
                return { success: true, payUrl: result.payUrl || result.checkoutUrl, data: result };
            } else {
                return {
                    success: false,
                    message: result.message || `Lỗi: ${result.resultCode}`,
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
                const redirectUrl = window.location.href.split('?')[0] + "?id=" + (payload.fundId || '') + "&orderId=" + orderId + "&gateway=momo";

                const proxyPayload = {
                    gateway: 'momo', // Explicit gateway flag
                    orderId: orderId,
                    amount: payload.amount,
                    orderInfo: orderInfo,
                    redirectUrl: redirectUrl,
                    name: cleanName
                };

                // Call API via POST
                const result = await callProxyAPI(proxyPayload);

                if (result.success && result.payUrl) {
                    console.log("[PaymentGateway] Redirecting to MoMo:", result.payUrl);
                    window.location.href = result.payUrl;
                } else {
                    console.error("[PaymentGateway] MoMo Error:", result.message);
                    showQRCodeFallback(proxyPayload, orderId);
                }

            } catch (e) {
                console.error("[PaymentGateway] Exception:", e);
                alert("Lỗi kết nối thanh toán: " + e.message);
            }
        },

        /**
         * Pay with NganLuong
         * @param {Object} payload - { code, amount, name, fundId, email, phone }
         */
        payWithNganLuong: function (payload) {
            console.log("[PaymentGateway] Initiating NganLuong Payment (Standard Redirect)...", payload);

            try {
                // CLIENT-SIDE CONFIG (Production)
                const NL_CONFIG = {
                    MERCHANT_ID: "69462",
                    MERCHANT_PASSWORD: "00f29ea19b05aa00d27f377a31efe68b",
                    RECEIVER_EMAIL: "hoangquy@imail.edu.vn",
                    API_ENDPOINT: "https://www.nganluong.vn/checkout.php"
                };

                // Helper: Compute MD5
                const computeMD5 = (str) => {
                    if (typeof CryptoJS !== 'undefined') {
                        return CryptoJS.MD5(str).toString();
                    }
                    console.error("CryptoJS not found!");
                    return "";
                };

                // Prepare Parameters
                const orderId = payload.code;
                const amount = payload.amount.toString();
                const cleanName = removeAccents(payload.name);
                const orderInfo = "Ung ho quy TDP21: " + cleanName;
                const returnUrl = window.location.href.split('?')[0] + "?id=" + (payload.fundId || '') + "&orderId=" + orderId + "&gateway=nganluong";
                const cancelUrl = window.location.href.split('?')[0] + "?id=" + (payload.fundId || '') + "&orderId=" + orderId + "&gateway=nganluong&error_code=1006"; // 1006: Cancelled

                // Standard Checkout Parameters
                const merchant_site_code = NL_CONFIG.MERCHANT_ID;
                const receiver = NL_CONFIG.RECEIVER_EMAIL;
                const transaction_info = orderInfo;
                const order_code = orderId;
                const price = amount;
                const currency = "vnd";
                const quantity = "1";
                const tax = "0";
                const discount = "0";
                const fee_cal = "0";
                const fee_shipping = "0";
                const order_description = orderInfo;
                const buyer_info = (cleanName || "") + "*|*|*" + (payload.email || "") + "*" + (payload.phone || ""); // Format: name*|*address*|*email*mobile
                const affiliate_code = "";

                // Build checksum string 
                // Formula: merchant_site_code + " " + return_url + " " + receiver + " " + transaction_info + " " + order_code + " " + price + " " + currency + " " + quantity + " " + tax + " " + discount + " " + fee_cal + " " + fee_shipping + " " + order_description + " " + buyer_info + " " + affiliate_code + " " + password
                let checksumString = merchant_site_code + " " +
                    returnUrl + " " +
                    receiver + " " +
                    transaction_info + " " +
                    order_code + " " +
                    price + " " +
                    currency + " " +
                    quantity + " " +
                    tax + " " +
                    discount + " " +
                    fee_cal + " " +
                    fee_shipping + " " +
                    order_description + " " +
                    buyer_info + " " +
                    affiliate_code + " " +
                    NL_CONFIG.MERCHANT_PASSWORD;

                const secure_code = computeMD5(checksumString);

                console.log("[NganLuong] Form Data:", { orderId, amount, returnUrl, cancelUrl });

                // Create Form
                const form = document.createElement("form");
                form.method = "POST";
                form.action = NL_CONFIG.API_ENDPOINT;

                const params = {
                    merchant_site_code,
                    return_url: returnUrl,
                    cancel_url: cancelUrl,
                    receiver,
                    transaction_info,
                    order_code,
                    price,
                    currency,
                    quantity,
                    tax,
                    discount,
                    fee_cal,
                    fee_shipping,
                    order_description,
                    buyer_info,
                    affiliate_code,
                    secure_code,
                    lang: 'vi'
                };

                for (const key in params) {
                    const input = document.createElement("input");
                    input.type = "hidden";
                    input.name = key;
                    input.value = params[key];
                    form.appendChild(input);
                }
                // Submit Form
                console.log("[PaymentGateway] Submitting Form to NganLuong UI...");

                // Form is already populated by the params loop above.
                form.style.display = 'none';

                document.body.appendChild(form);
                form.submit();

                // Cleanup
                setTimeout(() => {
                    if (document.body.contains(form)) document.body.removeChild(form);
                }, 5000);

            } catch (e) {
                console.error("[PaymentGateway] Exception:", e);
                alert("Lỗi kết nối thanh toán Ngân Lượng: " + e.message);
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
                    gateway: 'momo',
                    success: resultCode === "0",
                    orderId: orderId,
                    message: params.get('message')
                };
            }
            return { isReturn: false };
        },

        /**
         * Check if returning from NganLuong
         */
        checkNganLuongPaymentStatus: function () {
            const params = new URLSearchParams(window.location.search);
            const gateway = params.get('gateway');
            const transactionInfo = params.get('transaction_info');
            const errorCode = params.get('error_code');
            const orderId = params.get('orderId') || params.get('order_code');

            // Check if this is a NganLuong return
            if (gateway === 'nganluong' || transactionInfo !== null || errorCode !== null) {
                const isCancelled = params.get('cancelled') === '1';
                const isSuccess = errorCode === "00";

                return {
                    isReturn: true,
                    gateway: 'nganluong',
                    success: isSuccess && !isCancelled,
                    orderId: orderId,
                    transactionId: params.get('transaction_id'),
                    message: isCancelled ? "Đã huỷ thanh toán" : (isSuccess ? "Thanh toán thành công" : "Thanh toán thất bại")
                };
            }
            return { isReturn: false };
        },

        /**
         * Check all gateway returns (unified)
         */
        checkAnyPaymentReturn: function () {
            // Check MoMo first
            const momoStatus = this.checkPaymentStatus();
            if (momoStatus.isReturn) return momoStatus;

            // Then check NganLuong
            const nlStatus = this.checkNganLuongPaymentStatus();
            if (nlStatus.isReturn) return nlStatus;

            return { isReturn: false };
        },

        getConfigInfo: function () {
            return {
                mode: "SERVERLESS",
                isConfigured: !GAS_WEB_APP_URL.includes('...'),
                supportedGateways: ['momo', 'nganluong']
            };
        }
    };

    // ============================================================
    // FALLBACK: QR CODE
    // ============================================================
    function showQRCodeFallback(payload, orderId) {
        const bankId = "MSB";
        const accNo = "968866975500";
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
