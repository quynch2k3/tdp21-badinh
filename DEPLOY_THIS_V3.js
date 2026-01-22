/**
 * BACKEND CMS v3.0 - Tá»” DÃ‚N PHá» 21 (Updated: 2026-01-02)
 * Há»— trá»£: BÃ i viáº¿t nÃ¢ng cao (Status, Featured, Tags...), Trang tÄ©nh, Cáº¥u hÃ¬nh.
 */

function setup() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Setup Sheet: ARTICLES
    setupSheet(ss, "Articles", [
        "ID", "TiÃªu Ä‘á»", "NgÃ y Ä‘Äƒng", "TÃ³m táº¯t", "Link áº¢nh", "Link Doc", "Danh má»¥c", "Ná»™i dung HTML",
        "Tráº¡ng thÃ¡i", "Ná»•i báº­t", "TÃ¡c giáº£", "LÆ°á»£t xem", "Tags", "ÄÃ­nh kÃ¨m", "Video Youtube"
    ]);

    // 2. Setup Sheet: PAGES
    setupSheet(ss, "Pages", [
        "Slug (Link)", "TÃªn Trang", "Link Google Doc", "Hiá»‡n Menu (TRUE/FALSE)", "Thá»© tá»±",
        "áº¢nh Banner", "Ná»™i dung HTML"
    ]);

    // 3. Setup Sheet: SETTINGS
    setupSheet(ss, "Settings", ["Key", "Value", "MÃ´ táº£"]);

    // 4. Setup Sheet: FEEDBACK
    setupSheet(ss, "Feedback", ["ID", "NgÃ y gá»­i", "Há» tÃªn", "LiÃªn há»‡", "TiÃªu Ä‘á»", "Ná»™i dung", "Tráº¡ng thÃ¡i"]);
}

function setupSheet(ss, name, headers) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
        sheet = ss.insertSheet(name);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        sheet.setFrozenRows(1);
    }
    if (sheet.getLastColumn() < headers.length) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    return sheet;
}

function doGet(e) {
    var action = e.parameter.action;

    if (action == "get_articles") return getList("Articles");
    if (action == "get_article_detail") return getArticleDetail(e.parameter.id);
    if (action == "get_pages") return getList("Pages");
    if (action == "get_settings") return getSettings();
    if (action == "get_content") return getDocContent(e.parameter.url);
    if (action == "get_feedback") return getList("Feedback"); // View feedback

    return response({ status: "running", version: "3.1" });
}

function doPost(e) {
    try {
        var data = JSON.parse(e.postData.contents);
        var action = data.action;

        if (action == "save_article") return saveRow("Articles", data);
        if (action == "save_page") return saveRow("Pages", data);
        if (action == "save_setting") return saveSetting(data);
        if (action == "delete_item") return deleteRow(data.sheet, data.id);
        if (action == "increment_view") return incrementView(data.id);
        if (action == "send_feedback") return handleFeedback(data);

        return response({ status: "error", message: "Action unknown" });
    } catch (ex) {
        return response({ status: "error", message: ex.toString() });
    }
}

// --- CORE FUNCTIONS ---

function getList(sheetName) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var result = [];

    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var obj = {};
        for (var j = 0; j < headers.length; j++) obj[headers[j]] = row[j];

        if (sheetName == "Articles") {
            obj.id = row[0];
            obj.title = row[1];
            obj.date = row[2];
            obj.summary = row[3];
            obj.image = row[4];
            obj.category = row[6];
            obj.status = row[8] || "Published";
            obj.featured = row[9];
            obj.author = row[10];
            obj.views = row[11];
            obj.tags = row[12];
        } else if (sheetName == "Pages") {
            // Add specific aliases for Pages if needed, otherwise obj already contains all header-mapped fields
            obj.slug = row[0];
            obj.title = row[1];
            obj.docLink = row[2];
            obj.menu = row[3];
            obj.order = row[4];
            obj.banner = row[5];
            obj.content = row[6];
        }
        result.push(obj);
    }

    if (sheetName == "Articles") {
        result.sort(function (a, b) { return new Date(b['NgÃ y Ä‘Äƒng']) - new Date(a['NgÃ y Ä‘Äƒng']); });
    }
    return response(result);
}

function getArticleDetail(id) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Articles");
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString() == id) {
            var row = data[i];
            return response({
                status: "success", type: "html",
                id: row[0], title: row[1], date: row[2], content: row[7],
                status: row[8], featured: row[9], author: row[10],
                views: row[11], tags: row[12], attachments: row[13], videoUrl: row[14]
            });
        }
    }
    return response({ status: "error", message: "Not found" });
}

function saveRow(sheetName, data) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    var id = data.id ? data.id.toString() : "";
    var rowData = [];
    var now = new Date();

    if (sheetName == "Articles") {
        var newId = id || new Date().getTime().toString();
        var dateVal = data['date'] ? new Date(data['date']) : now;

        var currentViews = 0;
        if (id) {
            var existingData = sheet.getDataRange().getValues();
            for (var k = 1; k < existingData.length; k++) {
                if (existingData[k][0].toString() == id) {
                    currentViews = existingData[k][11] || 0;
                    break;
                }
            }
        }

        rowData = [
            newId, data['title'], dateVal, data['summary'], data['image'],
            data['docLink'] || "", data['category'], data['content'],
            data['status'] || "Published", data['featured'] || false, data['author'] || "",
            currentViews, data['tags'] || "", data['attachments'] || "", data['videoUrl'] || ""
        ];

    } else if (sheetName == "Pages") {
        // Pages Schema: "Slug (Link)", "TÃªn Trang", "Link Google Doc", "Hiá»‡n Menu (TRUE/FALSE)", "Thá»© tá»±", "áº¢nh Banner", "Ná»™i dung HTML"
        id = data['slug'];
        newId = id;

        rowData = [
            data['slug'],
            data['title'],
            data['docLink'] || "",
            data['menu'],
            data['order'],
            data['banner'] || "",
            data['content'] || ""
        ];
    }

    if (sheet.getMaxColumns() < rowData.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), rowData.length - sheet.getMaxColumns());

    if (id) {
        var dataRange = sheet.getDataRange().getValues();
        for (var i = 1; i < dataRange.length; i++) {
            if (dataRange[i][0].toString() == id) {
                sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
                return response({ status: "success", message: "Updated", id: newId });
            }
        }
    } else {
        sheet.appendRow(rowData);
        return response({ status: "success", message: "Created", id: newId });
    }
}


function incrementView(id) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Articles");
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString() == id.toString()) {
            var current = data[i][11];
            if (!current || isNaN(current)) current = 0;
            sheet.getRange(i + 1, 12).setValue(current + 1);
            return response({ status: "success" });
        }
    }
    return response({ status: "error" });
}

function saveSetting(data) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
    var key = data.key; var val = data.value;
    var dataRange = sheet.getDataRange().getValues();
    for (var i = 1; i < dataRange.length; i++) {
        if (dataRange[i][0] == key) {
            sheet.getRange(i + 1, 2).setValue(val);
            return response({ status: "success" });
        }
    }
    sheet.appendRow([key, val, "New Setting"]);
    return response({ status: "success", id: id });
}

function handleFeedback(data) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Feedback");
    if (!sheet) {
        setup(); // Init if missing
        sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Feedback");
    }

    var id = "FB_" + new Date().getTime();
    var date = new Date();

    // Append to Sheet
    sheet.appendRow([
        id,
        date,
        data.name,
        data.contact,
        data.subject,
        data.message,
        "New"
    ]);

    // Send Email Notification
    try {
        // Fix: getActiveUser() returns null for anonymous visitors. 
        // Use getEffectiveUser() to get the script owner's email (Admin).
        var adminEmail = Session.getEffectiveUser().getEmail();
        // Or hardcode: var adminEmail = "to-dan-pho-21@gmail.com";

        var subject = "[TDP21] GÃ³p Ã½ má»›i: " + data.subject;
        var body = "Há»‡ thá»‘ng vá»«a nháº­n Ä‘Æ°á»£c gÃ³p Ã½ má»›i:\n\n" +
            "Há» tÃªn: " + data.name + "\n" +
            "LiÃªn há»‡: " + data.contact + "\n" +
            "TiÃªu Ä‘á»: " + data.subject + "\n" +
            "Ná»™i dung: \n" + data.message + "\n\n" +
            "Thá»i gian: " + date.toLocaleString('vi-VN');

        MailApp.sendEmail({
            to: adminEmail,
            subject: subject,
            body: body
        });
    } catch (e) {
        // Email fail shouldn't stop flow
        console.error("Email error: " + e.toString());
    }

    return response({ status: "success", message: "Gá»­i gÃ³p Ã½ thÃ nh cÃ´ng" });
}

function deleteRow(sheetName, id) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString() == id.toString()) {
            sheet.deleteRow(i + 1);
            return response({ status: "success" });
        }
    }
    return response({ status: "error", message: "Not found" });
}

function getSettings() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
    var data = sheet.getDataRange().getValues();
    var settings = {};
    for (var i = 1; i < data.length; i++) { settings[data[i][0]] = data[i][1]; }
    return response(settings);
}

// --- GOOGLE DOCS PROCESSING ---

function getDocContent(url) {
    try {
        var id = extractDocId(url);
        if (!id) return response({ status: "error", message: "Invalid URL" });
        var doc = DocumentApp.openById(id);
        var body = doc.getBody();
        var title = doc.getName();
        var html = convertBodyToHtml(body);
        return response({ status: "success", title: title, content: html });
    } catch (e) {
        return response({ status: "error", message: e.toString() });
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
            } catch (e) { }
        }
    }
    return content;
}

function response(data) {
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

