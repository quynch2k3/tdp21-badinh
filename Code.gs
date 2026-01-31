/**
 * MOMO PAYMENT GATEWAY - GOOGLE APPS SCRIPT
 * STRATEGY: FORM POST HANDLER
 * 1. Receives Form Data from Client
 * 2. Calls MoMo API
 * 3. Redirects User to MoMo PayUrl
 */

function doPost(e) {
  try {
    // 1. EXTRACT FORM DATA (Not JSON, but Parameter map)
    var p = e.parameter;
    
    // Config
    var PARTNER_CODE = "MOMO9LID20260123_TEST";
    var ACCESS_KEY = "vveSdoaTZmBo09ks";
    var SECRET_KEY = "zcSkh7dxPLyZXLurEVbZrTUYWz8IQIks";
    var API_ENDPOINT = "https://test-payment.momo.vn/v2/gateway/api/create";
    
    // 2. PREPARE PAYLOAD
    var orderId = p.orderId;
    var requestId = orderId;
    var amount = p.amount;
    var orderInfo = p.orderInfo;
    var redirectUrl = p.redirectUrl;
    var ipnUrl = p.ipnUrl;
    var extraData = "";
    var requestType = "captureWallet";
    
    // 3. GENERATE SIGNATURE (Server-Side)
    var rawSignature = "accessKey=" + ACCESS_KEY +
                       "&amount=" + amount +
                       "&extraData=" + extraData +
                       "&ipnUrl=" + ipnUrl +
                       "&orderId=" + orderId +
                       "&orderInfo=" + orderInfo +
                       "&partnerCode=" + PARTNER_CODE +
                       "&redirectUrl=" + redirectUrl +
                       "&requestId=" + requestId +
                       "&requestType=" + requestType;
                       
    var signature = computeHmacSha256Signature(rawSignature, SECRET_KEY);
    
    // 4. MOMO REQUEST
    var requestBody = {
        partnerCode: PARTNER_CODE,
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
    
    var response = UrlFetchApp.fetch(API_ENDPOINT, options);
    var result = JSON.parse(response.getContentText());
    
    // 5. HANDLE RESULT & REDIRECT
    if (result.payUrl) {
       // SUCCESS: Return a self-executing redirect page
       var html = '<!DOCTYPE html><html><body style="background:#f5f5f5; text-align:center; padding-top:50px; font-family:sans-serif;">' +
                  '<h3 style="color:#a50064;">Dang ket noi MoMo...</h3>' +
                  '<p>Vui long doi trong giay lat.</p>' +
                  '<script>window.location.href="' + result.payUrl + '";</script>' +
                  '</body></html>';
       return HtmlService.createHtmlOutput(html);
    } else {
       // ERROR
       return HtmlService.createHtmlOutput("<h2>Loi Thanh Toan:</h2><p>" + result.message + "</p>");
    }

  } catch (ex) {
    return HtmlService.createHtmlOutput("Error: " + ex.toString());
  }
}

function computeHmacSha256Signature(data, key) {
  var byteSignature = Utilities.computeHmacSha256Signature(data, key);
  return byteSignature.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}
