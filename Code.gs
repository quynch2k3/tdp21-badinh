/**
 * BACKEND CMS v2.1 - TỔ DÂN PHỐ 21 (Updated: 2026-01-02)
 * Hỗ trợ: Bài viết (HTML/Doc), Trang tĩnh, Cấu hình hệ thống
 */

// ====================================================
// CẤU HÌNH NGÂN LƯỢNG (DÀNH CHO THANH TOÁN THỰC)
// ====================================================
// Bạn hãy thay đổi các giá trị dưới đây bằng thông tin thật của bạn
// lấy từ trang quản trị NganLuong.vn

var NL_MERCHANT_ID = "69460";      // Mã kết nối (Merchant ID)
var NL_MERCHANT_PASS = "65f2077b091d243a3779e8a5c2dcb533"; // Mật khẩu kết nối (Merchant Password)
var NL_RECEIVER_EMAIL = "hoangquy@imail.edu.vn"; // Email nhận tiền

// ====================================================

function testAuthorization() {
  // Run this function once to authorize UrlFetchApp
  UrlFetchApp.fetch("https://www.google.com");
  Logger.log("Authorized successfully!");
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Setup Sheet: ARTICLES
  setupSheet(ss, "Articles", [
    "ID", "Tiêu đề", "Ngày đăng", "Tóm tắt", "Link Ảnh", "Link Doc", "Danh mục", "Nội dung HTML"
  ]);
  
  // 2. Setup Sheet: PAGES (Trang tĩnh / Menu)
  var pageSheet = setupSheet(ss, "Pages", [
    "Slug (Link)", "Tên Trang", "Link Google Doc", "Hiện Menu (TRUE/FALSE)", "Thứ tự"
  ]);
  
  // Thêm dữ liệu mẫu cho Pages nếu chưa có
  if (pageSheet.getLastRow() < 2) {
    pageSheet.getRange(2, 1, 7, 5).setValues([
      ["index", "Trang Chủ", "", true, 1],
      ["mat-tran-to-quoc", "Mặt Trận Tổ Quốc", "", true, 2],
      ["hoi-phu-nu", "Hội Phụ Nữ", "https://docs.google.com/document/d/1...", true, 3],
      ["hoi-cuu-chien-binh", "Hội Cựu Chiến Binh", "", true, 4],
      ["doan-thanh-nien", "Đoàn Thanh Niên", "", true, 5],
      ["hoi-nguoi-cao-tuoi", "Hội Người Cao Tuổi", "", true, 6],
      ["ban-khuyen-hoc", "Ban Khuyến Học", "", true, 7]
    ]);
  }

  // 3. Setup Sheet: SETTINGS (Cấu hình)
  var settingSheet = setupSheet(ss, "Settings", ["Key", "Value", "Mô tả"]);
  if (settingSheet.getLastRow() < 2) {
      settingSheet.getRange(2, 1, 6, 3).setValues([
          ["website_title", "Cổng Thông Tin Tổ Dân Phố 21", "Tiêu đề trang web"],
          ["hotline", "0987654321", "Số điện thoại hiển thị"],
          ["email", "tdp21@badinh.gov.vn", "Email liên hệ"],
          ["facebook", "https://facebook.com", "Link Fanpage"],
          ["address", "Nhà Sinh Hoạt Cộng Đồng Số 21, Phường Ba Đình, TP Hà Nội", "Địa chỉ"],
          ["menu_order", "index,mat-tran-to-quoc,hoi-phu-nu,hoi-cuu-chien-binh,doan-thanh-nien", "Thứ tự menu (System)"]
      ]);
  }
}

function setupSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  // Check if headers need update (simple check)
  if (sheet.getLastColumn() < headers.length) {
     sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function doGet(e) {
  var action = e.parameter.action;
  
  if (action == "get_articles") {
    return getList("Articles");
  } else if (action == "create_nganluong_url") {
    // JSON API (Old way)
    var result = buildNganLuongData(e.parameter);
    return response(result);
  } else if (action == "get_article_detail") {
    return getArticleDetail(e.parameter.id);
  } else if (action == "get_pages") {
    return getList("Pages");
  } else if (action == "get_settings") {
    return getSettings();
  } else if (action == "get_content") {
    return getDocContent(e.parameter.url);
  } else if (action == "get_menu") {
    return getMenu(); // Implement if needed or use get_pages
  }
  
  else if (action == "redirect_payment") {
    // NEW: Return HTML that auto-redirects (Bypasses CORS completely)
    var result = buildNganLuongData(e.parameter);
    if (result.status == "success") {
       return HtmlService.createHtmlOutput("<script>window.location.href='" + result.paymentUrl + "';</script>");
    } else {
       return ContentService.createTextOutput("Error: " + result.message);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: "running"}));
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    
    if (action == "save_article") {
      return saveRow("Articles", data);
    } else if (action == "save_page") {
      return saveRow("Pages", data);
    } else if (action == "save_setting") {
      return saveSetting(data);
    } else if (action == "delete_item") {
      return deleteRow(data.sheet, data.id);
    }
    
    return response({status: "error", message: "Action unknown"});
  } catch (ex) {
    return response({status: "error", message: ex.toString()});
  }
}

// --- HELPER FUNCTIONS ---

function getList(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      item[headers[j]] = data[i][j];
    }
    result.push(item);
  }
  
  // Reverse to get newest first
  return response(result.reverse());
}

function getSettings() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
  var data = sheet.getDataRange().getValues();
  var settings = {};
  for(var i=1; i<data.length; i++) {
     settings[data[i][0]] = data[i][1];
  }
  return response(settings);
}

function getArticleDetail(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Articles");
  var data = sheet.getDataRange().getValues();
  
  for(var i=1; i<data.length; i++) {
    if(data[i][0].toString() == id) {
       var htmlContent = data[i][7]; // Col H: Nội dung HTML (Index 7)
       var docUrl = data[i][5];      // Col E: Link Doc (Index 5)
       
       if (htmlContent && htmlContent.length > 5) {
           return response({status: "success", type: "html", title: data[i][1], content: htmlContent, date: data[i][2]});
       } else if (docUrl) {
           // Fallback to Doc
           return getDocContent(docUrl); 
       } else {
           return response({status: "error", message: "No content found"});
       }
    }
  }
  return response({status: "error", message: "Not found"});
}


function saveRow(sheetName, data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var id = data.id ? data.id.toString() : "";
  
  // Custom mapping based on sheet
  var rowData = [];
  var now = new Date(); 
  
  if (sheetName == "Articles") {
      var newId = id || new Date().getTime().toString();
      var dateVal = now;
      if(data['Ngày đăng']) dateVal = data['Ngày đăng'];

      rowData = [
          newId,
          data['Tiêu đề'],
          dateVal,
          data['Tóm tắt'],
          data['Link Ảnh'],
          data['Link Doc'],
          data['Danh mục'],
          data['Nội dung HTML']
      ];
      
      // AUTO-EXPAND COLUMNS IF NEEDED (Critical Fix)
      if (sheet.getMaxColumns() < rowData.length) {
          sheet.insertColumnsAfter(sheet.getMaxColumns(), rowData.length - sheet.getMaxColumns());
      }
      
      if (id) {
          // Update
           var dataRange = sheet.getDataRange().getValues();
           for(var i=1; i<dataRange.length; i++) {
               if(dataRange[i][0].toString() == id) {
                   sheet.getRange(i+1, 1, 1, rowData.length).setValues([rowData]);
                   return response({status: "success", message: "Updated"});
               }
           }
      } else {
          // Insert
          sheet.appendRow(rowData);
          return response({status: "success", message: "Created"});
      }
  } 
  else if (sheetName == "Pages") {
       rowData = [
          data['Slug (Link)'],
          data['Tên Trang'],
          data['Link Google Doc'],
          data['Hiện Menu (TRUE/FALSE)'],
          data['Thứ tự']
      ];
      
      // Check columns for Pages too
      if (sheet.getMaxColumns() < rowData.length) {
          sheet.insertColumnsAfter(sheet.getMaxColumns(), rowData.length - sheet.getMaxColumns());
      }

      var targetSlug = data['Slug (Link)'];
      // Check if updating existing
       var dataRange = sheet.getDataRange().getValues();
       var updated = false;
       for(var i=1; i<dataRange.length; i++) {
           if(dataRange[i][0] == targetSlug) {
               sheet.getRange(i+1, 1, 1, rowData.length).setValues([rowData]);
               updated = true;
               break;
           }
       }
       if(!updated) sheet.appendRow(rowData);
       
      return response({status: "success"});
  }

  return response({status: "error", message: "Sheet not supported"});
}

function saveSetting(data) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
    var key = data.key;
    var val = data.value;
    
    var dataRange = sheet.getDataRange().getValues();
    for(var i=1; i<dataRange.length; i++) {
        if(dataRange[i][0] == key) {
            sheet.getRange(i+1, 2).setValue(val);
            return response({status: "success"});
        }
    }
    // New setting
    sheet.appendRow([key, val, "New Setting"]);
    return response({status: "success"});
}

function deleteRow(sheetName, id) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    var data = sheet.getDataRange().getValues();
    for(var i=1; i<data.length; i++) {
        // If Pages, id is Slug (col 0). If Articles, id is ID (col 0).
        if(data[i][0].toString() == id.toString()) {
            sheet.deleteRow(i+1);
            return response({status: "success"});
        }
    }
    return response({status: "error", message: "Not found"});
}

// --- GOOGLE DOCS PROCESSING ---

function getDocContent(url) {
  try {
    var id = extractDocId(url);
    if (!id) return response({status: "error", message: "Invalid URL"});
    
    var doc = DocumentApp.openById(id);
    var body = doc.getBody();
    var title = doc.getName();
    var html = convertBodyToHtml(body);
    
    return response({status: "success", title: title, content: html});
  } catch (e) {
    return response({status: "error", message: e.toString()});
  }
}

function extractDocId(url) {
  var match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function convertBodyToHtml(body) {
  var html = "";
  var children = body.getNumChildren();
  for (var i = 0; i < children; i++) {
    var child = body.getChild(i);
    var type = child.getType();
    if (type == DocumentApp.ElementType.PARAGRAPH) {
      html += processParagraph(child);
    } else if (type == DocumentApp.ElementType.LIST_ITEM) {
      html += "<li>" + processTextAndImages(child) + "</li>";
    }
  }
  return html;
}

function processParagraph(element) {
  var heading = element.getHeading();
  var tag = "p";
  if (heading == DocumentApp.ParagraphHeading.HEADING1) tag = "h2";
  else if (heading == DocumentApp.ParagraphHeading.HEADING2) tag = "h3";
  else if (heading == DocumentApp.ParagraphHeading.HEADING3) tag = "h4";
  
  var content = processTextAndImages(element);
  if (!content) return "";
  return "<" + tag + ">" + content + "</" + tag + ">";
}

function processTextAndImages(element) {
  var content = "";
  var numChildren = element.getNumChildren();
  for (var i = 0; i < numChildren; i++) {
    var child = element.getChild(i);
    var type = child.getType();
    if (type == DocumentApp.ElementType.TEXT) {
      content += child.getText();
    } else if (type == DocumentApp.ElementType.INLINE_IMAGE) {
      try {
        var blob = child.getBlob();
        var base64 = Utilities.base64Encode(blob.getBytes());
        content += '<img src="data:' + blob.getContentType() + ';base64,' + base64 + '" style="max-width:100%; display:block; margin: 10px auto;" />';
      } catch (e) {}
    }
  }
  return content;
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// --- NGAN LUONG PAYMENT INTEGRATION API v3.1 ---
// Based on NL_Checkoutv3.php logic

function buildNganLuongData(params) {
  try {
    // 1. CONFIGURATION
    var URL_API = 'https://www.nganluong.vn/checkout.api.nganluong.post.php';
    var MERCHANT_ID = NL_MERCHANT_ID;
    var MERCHANT_PASS = NL_MERCHANT_PASS;
    var RECEIVER_EMAIL = NL_RECEIVER_EMAIL;
    
    // 2. PREPARE PARAMETERS
    var order_code = params.order_code || ("ORD_" + new Date().getTime());
    var total_amount = params.total_amount || "10000";
    var buyer_fullname = params.buyer_fullname || "Khach vang lai";
    var buyer_email = params.buyer_email || "no-email@domain.com";
    var buyer_mobile = params.buyer_mobile || "0900000000";
    var return_url = params.return_url || "https://google.com";
    var cancel_url = params.cancel_url || "https://google.com";
    
    // Parameters for SetExpressCheckout (API v3.1)
    // IMPORTANT: If 'NL_MERCHANT_PASS' is already an MD5 Hash (32 chars), 
    // you should NOT hash it again. 
    // However, the standard SDK always hashes. 
    // If you get Error 07 ("Wrong Password"), try removing MD5() wrapping below.
    var requestParams = {
        'function': 'SetExpressCheckout',
        'version': '3.1',
        'merchant_id': MERCHANT_ID,
        'merchant_password': MD5(MERCHANT_PASS), // <--- Standard way. Remove MD5() if using pre-hashed key.
        'receiver_email': RECEIVER_EMAIL,
        'order_code': order_code,
        'total_amount': total_amount,
        'payment_method': 'NL', // Default to Wallet/General
        'payment_type': '1',    // 1=Instant, 2=Hold. Default to 1 (Immediate)
        'order_description': 'Ung ho quy TDP21',
        'tax_amount': '0',
        'fee_shipping': '0',
        'discount_amount': '0',
        'return_url': return_url,
        'cancel_url': cancel_url,
        'buyer_fullname': buyer_fullname,
        'buyer_email': buyer_email,
        'buyer_mobile': buyer_mobile,
        'buyer_address': '',
        'total_item': '0',
        'cur_code': 'vnd'
    };
    
    // 3. CALL NGAN LUONG API (Server-side)
    var options = {
      'method': 'post',
      'payload': requestParams,
      'muteHttpExceptions': true
    };
    
    var response = UrlFetchApp.fetch(URL_API, options);
    var xmlContent = response.getContentText();
    
    // 4. PARSE XML RESPONSE
    var document = XmlService.parse(xmlContent);
    var root = document.getRootElement();
    var errorCode = root.getChild('error_code').getText();
    
    if (errorCode == '00') {
       // Success
       var checkoutUrl = root.getChild('checkout_url').getText();
       var token = root.getChild('token').getText();
       return { status: "success", paymentUrl: checkoutUrl };
    } else {
       // Error
       var description = root.getChild('description') ? root.getChild('description').getText() : "Unknown error";
       return { status: "error", message: "NganLuong Error " + errorCode + ": " + description };
    }

  } catch (ex) {
    return { status: "error", message: ex.toString() + " (Log: " + (xmlContent || "No Response") + ")" };
  }
}

// Helper: MD5
function MD5(input) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, input, Utilities.Charset.UTF_8);
  var txtHash = '';
  for (i = 0; i < rawHash.length; i++) {
    var hashVal = rawHash[i];
    if (hashVal < 0) {
      hashVal += 256;
    }
    if (hashVal.toString(16).length == 1) {
      txtHash += '0';
    }
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}


function bytesToHex(bytes) {
  var hex = [];
  for (var i = 0; i < bytes.length; i++) {
    var b = parseInt(bytes[i]);
    if (b < 0) {
      b += 256;
    }
    var s = b.toString(16);
    if (s.length == 1) {
      s = "0" + s;
    }
    hex.push(s);
  }
  return hex.join("");
}

