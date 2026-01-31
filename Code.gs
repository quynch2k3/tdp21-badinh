/**
 * MOMO PAYMENT GATEWAY - GOOGLE APPS SCRIPT PROXY
 * Ensures no CORS issues and secures the Secret Key.
 */

function doPost(e) {
  try {
    // 1. EXTRACT DATA
    var data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }
    
    // Config - KEEP SECRET_KEY HERE ONLY
    var ENV = 'SANDBOX'; // 'PROD' or 'SANDBOX'
    var CONFIG = {
      SANDBOX: {
        PARTNER_CODE: "MOMO9LID20260123_TEST",
        ACCESS_KEY: "vveSdoaTZmBo09ks",
        SECRET_KEY: "zcSkh7dxPLyZXLurEVbZrTUYWz8IQIks",
        API_ENDPOINT: "https://test-payment.momo.vn/v2/gateway/api/create"
      },
      PROD: {
        PARTNER_CODE: "MOMO9LID20260123",
        ACCESS_KEY: "vveSdoaTZmBo09ks",
        SECRET_KEY: "zcSkh7dxPLyZXLurEVbZrTUYWz8IQIks",
        API_ENDPOINT: "https://payment.momo.vn/v2/gateway/api/create"
      }
    };
    
    var activeConfig = CONFIG[ENV];
    
    // 2. PREPARE PARAMETERS (Strict Order for MoMo)
    var orderId = data.orderId;
    var requestId = data.requestId || orderId;
    var amount = data.amount.toString();
    var orderInfo = data.orderInfo || "Thanh toan MoMo";
    var redirectUrl = data.redirectUrl;
    var ipnUrl = data.ipnUrl || redirectUrl;
    var extraData = data.extraData || "";
    var requestType = "captureWallet";
    
    // 3. GENERATE SIGNATURE (Securely on Backend)
    var rawSignature = "accessKey=" + activeConfig.ACCESS_KEY +
                       "&amount=" + amount +
                       "&extraData=" + extraData +
                       "&ipnUrl=" + ipnUrl +
                       "&orderId=" + orderId +
                       "&orderInfo=" + orderInfo +
                       "&partnerCode=" + activeConfig.PARTNER_CODE +
                       "&redirectUrl=" + redirectUrl +
                       "&requestId=" + requestId +
                       "&requestType=" + requestType;
                       
    var signature = computeHmacSha256Signature(rawSignature, activeConfig.SECRET_KEY);
    
    // 4. CALL MOMO API
    var requestBody = {
        partnerCode: activeConfig.PARTNER_CODE,
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
    
    var options = {
        'method': 'post',
        'contentType': 'application/json',
        'payload': JSON.stringify(requestBody),
        'muteHttpExceptions': true
    };
    
    var response = UrlFetchApp.fetch(activeConfig.API_ENDPOINT, options);
    var resultStr = response.getContentText();
    var result = JSON.parse(resultStr);
    
    // 5. RETURN JSON RESPONSE TO FRONTEND
    return ContentService.createTextOutput(JSON.stringify(result))
                         .setMimeType(ContentService.MimeType.JSON);

  } catch (ex) {
    return ContentService.createTextOutput(JSON.stringify({ 
      resultCode: 99, 
      message: "Server Error: " + ex.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET - Process Payment and Redirect to MoMo
 */
function doGet(e) {
  try {
    // Check if payment parameters are present
    if (!e.parameter.orderId || !e.parameter.amount) {
      return ContentService.createTextOutput("MoMo Proxy is Active! Use GET with payment params to initiate payment.");
    }
    
    // Extract parameters from URL
    var orderId = e.parameter.orderId;
    var amount = e.parameter.amount;
    var orderInfo = e.parameter.orderInfo || "Thanh toan MoMo";
    var redirectUrl = e.parameter.redirectUrl;
    var name = e.parameter.name || "";
    
    // Config - KEEP SECRET_KEY HERE ONLY
    var ENV = 'SANDBOX'; // 'PROD' or 'SANDBOX'
    var CONFIG = {
      SANDBOX: {
        PARTNER_CODE: "MOMO9LID20260123_TEST",
        ACCESS_KEY: "vveSdoaTZmBo09ks",
        SECRET_KEY: "zcSkh7dxPLyZXLurEVbZrTUYWz8IQIks",
        API_ENDPOINT: "https://test-payment.momo.vn/v2/gateway/api/create"
      },
      PROD: {
        PARTNER_CODE: "MOMO9LID20260123",
        ACCESS_KEY: "vveSdoaTZmBo09ks",
        SECRET_KEY: "zcSkh7dxPLyZXLurEVbZrTUYWz8IQIks",
        API_ENDPOINT: "https://payment.momo.vn/v2/gateway/api/create"
      }
    };
    
    var activeConfig = CONFIG[ENV];
    
    // Prepare parameters
    var requestId = orderId;
    var ipnUrl = redirectUrl;
    var extraData = "";
    var requestType = "captureWallet";
    
    // Generate signature
    var rawSignature = "accessKey=" + activeConfig.ACCESS_KEY +
                       "&amount=" + amount +
                       "&extraData=" + extraData +
                       "&ipnUrl=" + ipnUrl +
                       "&orderId=" + orderId +
                       "&orderInfo=" + orderInfo +
                       "&partnerCode=" + activeConfig.PARTNER_CODE +
                       "&redirectUrl=" + redirectUrl +
                       "&requestId=" + requestId +
                       "&requestType=" + requestType;
                       
    var signature = computeHmacSha256Signature(rawSignature, activeConfig.SECRET_KEY);
    
    // Call MoMo API
    var requestBody = {
        partnerCode: activeConfig.PARTNER_CODE,
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
    
    var options = {
        'method': 'post',
        'contentType': 'application/json',
        'payload': JSON.stringify(requestBody),
        'muteHttpExceptions': true
    };
    
    var response = UrlFetchApp.fetch(activeConfig.API_ENDPOINT, options);
    var resultStr = response.getContentText();
    var result = JSON.parse(resultStr);
    
    // If successful, redirect to MoMo payment page
    if (result.resultCode === 0 && result.payUrl) {
      var payUrl = result.payUrl;
      var returnUrl = e.parameter.redirectUrl ? e.parameter.redirectUrl.split('?')[0] : '';
      
      // Solution: Open MoMo in new window/tab and redirect back to donation page
      var html = '<!DOCTYPE html>' +
                 '<html>' +
                 '<head>' +
                 '  <meta charset="UTF-8">' +
                 '  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
                 '  <title>Đang mở cổng thanh toán...</title>' +
                 '  <style>' +
                 '    * { box-sizing: border-box; }' +
                 '    body { font-family: Arial, sans-serif; text-align: center; padding: 30px; background: linear-gradient(135deg, #fdf2f8 0%, #fff 100%); min-height: 100vh; margin: 0; }' +
                 '    .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px 30px; border-radius: 16px; box-shadow: 0 10px 40px rgba(165,0,100,0.15); }' +
                 '    .icon { font-size: 60px; margin-bottom: 20px; }' +
                 '    h2 { color: #333; margin: 0 0 15px 0; font-size: 22px; }' +
                 '    p { color: #666; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6; }' +
                 '    .btn { display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #a50064, #d63384); color: white; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(165,0,100,0.4); transition: transform 0.2s; }' +
                 '    .btn:hover { transform: translateY(-2px); }' +
                 '    .note { margin-top: 25px; padding: 15px; background: #fef3c7; border-radius: 10px; color: #92400e; font-size: 13px; }' +
                 '    .back-link { display: inline-block; margin-top: 20px; color: #a50064; text-decoration: none; font-size: 14px; }' +
                 '  </style>' +
                 '</head>' +
                 '<body>' +
                 '  <div class="container">' +
                 '    <div class="icon">💳</div>' +
                 '    <h2>Cổng thanh toán MoMo đã mở!</h2>' +
                 '    <p>Vui lòng hoàn tất thanh toán trong cửa sổ mới.<br>Sau khi thanh toán xong, quay lại trang này.</p>' +
                 '    <a href="' + payUrl + '" target="_blank" class="btn" id="openBtn">🔓 Mở lại cổng thanh toán</a>' +
                 '    <div class="note">💡 <strong>Lưu ý:</strong> Nếu cửa sổ không tự động mở, hãy nhấn nút bên trên.</div>' +
                 '    <a href="' + returnUrl + '" class="back-link">← Quay lại trang đóng góp</a>' +
                 '  </div>' +
                 '  <script>' +
                 '    // Open MoMo in new window immediately' +
                 '    var momoWindow = window.open("' + payUrl + '", "_blank");' +
                 '    if (!momoWindow || momoWindow.closed || typeof momoWindow.closed == "undefined") {' +
                 '      // Popup blocked - show manual button' +
                 '      document.querySelector(".note").innerHTML = "⚠️ <strong>Trình duyệt đã chặn popup!</strong> Hãy nhấn nút <strong>Mở lại cổng thanh toán</strong> bên trên.";' +
                 '      document.querySelector(".note").style.background = "#fee2e2";' +
                 '      document.querySelector(".note").style.color = "#dc2626";' +
                 '    }' +
                 '  </script>' +
                 '</body>' +
                 '</html>';
      
      return HtmlService.createHtmlOutput(html)
        .setTitle('Thanh toán MoMo')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } else {
      // Error - show error page
      var errorHtml = '<!DOCTYPE html>' +
                      '<html>' +
                      '<head><meta charset="UTF-8"><title>Lỗi thanh toán</title></head>' +
                      '<body style="font-family: Arial; text-align: center; padding: 50px;">' +
                      '  <h2 style="color: #d32f2f;">❌ Lỗi kết nối MoMo</h2>' +
                      '  <p>' + (result.message || 'Không thể kết nối đến cổng thanh toán') + '</p>' +
                      '  <button onclick="window.history.back()" style="padding: 10px 20px; background: #a50064; color: white; border: none; border-radius: 5px; cursor: pointer;">Quay lại</button>' +
                      '</body>' +
                      '</html>';
      return HtmlService.createHtmlOutput(errorHtml);
    }
    
  } catch (ex) {
    var errorHtml = '<!DOCTYPE html>' +
                    '<html>' +
                    '<head><meta charset="UTF-8"><title>Lỗi hệ thống</title></head>' +
                    '<body style="font-family: Arial; text-align: center; padding: 50px;">' +
                    '  <h2 style="color: #d32f2f;">❌ Lỗi hệ thống</h2>' +
                    '  <p>' + ex.toString() + '</p>' +
                    '  <button onclick="window.history.back()" style="padding: 10px 20px; background: #a50064; color: white; border: none; border-radius: 5px; cursor: pointer;">Quay lại</button>' +
                    '</body>' +
                    '</html>';
    return HtmlService.createHtmlOutput(errorHtml);
  }
}

function computeHmacSha256Signature(data, key) {
  var byteSignature = Utilities.computeHmacSha256Signature(data, key);
  return byteSignature.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}
