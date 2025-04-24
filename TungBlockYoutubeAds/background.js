// Khởi tạo giá trị mặc định khi extension được cài đặt lần đầu
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(['enabled', 'adBlockEnabled'], function(result) {
      if (result.enabled === undefined) {
        chrome.storage.sync.set({enabled: true}, function() {
          console.log('Khởi tạo trạng thái Auto Continue mặc định: Đang bật');
        });
      }
      
      if (result.adBlockEnabled === undefined) {
        chrome.storage.sync.set({adBlockEnabled: true}, function() {
          console.log('Khởi tạo trạng thái Ad Block mặc định: Đang bật');
        });
      }
    });
  });
  
  // Lắng nghe sự kiện khi tab YouTube được kích hoạt
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Kiểm tra xem tab có phải là YouTube không
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
      // Thực thi content script vào tab
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }).catch(err => console.error('Không thể thực thi content script:', err));
    }
  });