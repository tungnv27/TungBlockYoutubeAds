document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleButton');
    const statusText = document.getElementById('statusText');
    const adBlockToggle = document.getElementById('adBlockToggle');
    const adBlockStatus = document.getElementById('adBlockStatus');
    
    // Lấy trạng thái từ storage khi popup được mở
    chrome.storage.sync.get(['enabled', 'adBlockEnabled'], function(result) {
      // Nếu không có dữ liệu, mặc định là bật
      const enabled = result.enabled !== undefined ? result.enabled : true;
      const adBlockEnabled = result.adBlockEnabled !== undefined ? result.adBlockEnabled : true;
      
      toggleButton.checked = enabled;
      adBlockToggle.checked = adBlockEnabled;
      
      updateStatus(enabled, statusText);
      updateStatus(adBlockEnabled, adBlockStatus);
    });
    
    // Xử lý khi toggle Auto Continue được click
    toggleButton.addEventListener('change', function() {
      const enabled = toggleButton.checked;
      
      // Lưu trạng thái vào storage
      chrome.storage.sync.set({enabled: enabled}, function() {
        console.log('Trạng thái Auto Continue đã được lưu: ' + enabled);
      });
      
      // Cập nhật text hiển thị
      updateStatus(enabled, statusText);
      
      // Gửi thông báo đến content script và background
      chrome.tabs.query({url: "*://*.youtube.com/*"}, function(tabs) {
        tabs.forEach(function(tab) {
          chrome.tabs.sendMessage(tab.id, {action: "toggleStatus", enabled: enabled});
        });
      });
    });
    
    // Xử lý khi toggle Ad Block được click
    adBlockToggle.addEventListener('change', function() {
      const enabled = adBlockToggle.checked;
      
      // Lưu trạng thái vào storage
      chrome.storage.sync.set({adBlockEnabled: enabled}, function() {
        console.log('Trạng thái Ad Block đã được lưu: ' + enabled);
      });
      
      // Cập nhật text hiển thị
      updateStatus(enabled, adBlockStatus);
      
      // Gửi thông báo đến content script
      chrome.tabs.query({url: "*://*.youtube.com/*"}, function(tabs) {
        tabs.forEach(function(tab) {
          chrome.tabs.sendMessage(tab.id, {action: "toggleAdBlock", enabled: enabled});
        });
      });
    });
    
    // Cập nhật trạng thái hiển thị
    function updateStatus(enabled, element) {
      element.textContent = enabled ? "Đang bật" : "Đang tắt";
    }
  });