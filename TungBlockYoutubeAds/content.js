// Biến toàn cục để theo dõi trạng thái
let isEnabled = true;
let adBlockEnabled = true; // Thêm biến chặn quảng cáo
let monitoringInterval = null;
let observerInstance = null;
let adCheckInterval = null; // Thêm interval cho việc kiểm tra quảng cáo

// Kiểm tra trạng thái từ storage khi script được tải
chrome.storage.sync.get(['enabled', 'adBlockEnabled'], function(result) {
  // Nếu không có dữ liệu, mặc định là bật
  isEnabled = result.enabled !== undefined ? result.enabled : true;
  adBlockEnabled = result.adBlockEnabled !== undefined ? result.adBlockEnabled : true;
  
  console.log('YouTube Auto-Continue: Trạng thái hiện tại: ' + (isEnabled ? 'Đang bật' : 'Đang tắt'));
  console.log('YouTube Ad Blocker: Trạng thái hiện tại: ' + (adBlockEnabled ? 'Đang bật' : 'Đang tắt'));
  
  // Nếu đang bật, bắt đầu theo dõi
  if (isEnabled) {
    startMonitoring();
  }
  
  // Nếu chặn quảng cáo đang bật, bắt đầu kiểm tra quảng cáo
  if (adBlockEnabled) {
    startAdBlocker();
  }
});

// Lắng nghe thông điệp từ popup.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "toggleStatus") {
    isEnabled = request.enabled;
    console.log('YouTube Auto-Continue: Trạng thái đã thay đổi: ' + (isEnabled ? 'Đang bật' : 'Đang tắt'));
    
    // Nếu bật, bắt đầu theo dõi ngay
    if (isEnabled) {
      startMonitoring();
    }
  }
  
  if (request.action === "toggleAdBlock") {
    adBlockEnabled = request.enabled;
    console.log('YouTube Ad Blocker: Trạng thái đã thay đổi: ' + (adBlockEnabled ? 'Đang bật' : 'Đang tắt'));
    
    if (adBlockEnabled) {
      startAdBlocker();
    } else {
      stopAdBlocker();
    }
  }
  return true;
});

// === PHẦN CHẶN QUẢNG CÁO ===
function skipAd() {
  if (!adBlockEnabled) return;
  
  // Phương pháp 1: Nhấn vào nút "Bỏ qua quảng cáo"
  const skipButtons = document.querySelectorAll('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .videoAdUiSkipButton');
  
  skipButtons.forEach(button => {
    console.log('YouTube Ad Blocker: Tìm thấy nút bỏ qua quảng cáo, đang click');
    button.click();
  });
  
  // Phương pháp 2: Tắt quảng cáo overlay
  const adOverlays = document.querySelectorAll('.ytp-ad-overlay-close-button');
  adOverlays.forEach(overlay => {
    console.log('YouTube Ad Blocker: Tìm thấy quảng cáo overlay, đang đóng');
    overlay.click();
  });
  
  // Phương pháp 3: Chuyển đến cuối video quảng cáo
  const videoElement = document.querySelector('video');
  const adBadge = document.querySelector('.ytp-ad-simple-ad-badge, .ytp-ad-text');
  
  if (videoElement && adBadge && !document.querySelector('.ytp-ad-skip-button')) {
    // Nếu có quảng cáo nhưng không có nút bỏ qua (quảng cáo ngắn)
    console.log('YouTube Ad Blocker: Phát hiện quảng cáo không thể bỏ qua, đang tua nhanh');
    
    // Một số quảng cáo không cho phép tua đến cuối
    // Thử tăng tốc độ phát lên tối đa
    if (videoElement.playbackRate) {
      videoElement.playbackRate = 16; // Tăng tốc độ phát lên tối đa
    }
    
    // Thử tắt tiếng
    if (videoElement.muted !== undefined) {
      videoElement.muted = true;
    }
    
    // Thử chuyển đến cuối video
    if (videoElement.duration && videoElement.currentTime !== undefined) {
      try {
        videoElement.currentTime = videoElement.duration - 0.1;
      } catch (e) {
        console.log('YouTube Ad Blocker: Không thể tua đến cuối quảng cáo', e);
      }
    }
  }
  
  // Phương pháp 4: Ẩn container quảng cáo
  const adContainers = [
    '.ytp-ad-module',
    '.ytp-ad-overlay-container',
    'ytd-companion-slot-renderer',
    'ytd-player-legacy-desktop-watch-ads-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-ad-slot-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-display-ad-renderer',
    'ytd-promoted-video-renderer',
    '.ytd-video-masthead-ad-v3-renderer'
  ];
  
  adContainers.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`YouTube Ad Blocker: Ẩn container quảng cáo ${selector}`);
      elements.forEach(el => {
        el.style.display = 'none';
        el.style.height = '0';
      });
    }
  });
}

function startAdBlocker() {
  if (adCheckInterval) {
    clearInterval(adCheckInterval);
  }
  
  // Chạy ngay lần đầu
  skipAd();
  
  // Sau đó kiểm tra thường xuyên với tần suất cao hơn (300ms)
  adCheckInterval = setInterval(() => {
    if (adBlockEnabled) {
      skipAd();
    }
  }, 300);
  
  console.log('YouTube Ad Blocker: Đã bắt đầu chặn quảng cáo');
}

function stopAdBlocker() {
  if (adCheckInterval) {
    clearInterval(adCheckInterval);
    adCheckInterval = null;
    console.log('YouTube Ad Blocker: Đã dừng chặn quảng cáo');
  }
}

// === PHẦN TỰ ĐỘNG XÁC NHẬN "VẪN ĐANG XEM" ===
// Hàm chính để tự động click vào các nút xác nhận
function autoClickContinueButton() {
  // Kiểm tra trạng thái trước khi thực hiện
  if (!isEnabled) return false;
  
  // Kiểm tra và click vào nút "Tiếp tục xem" (có thể khác nhau tùy ngôn ngữ)
  const confirmButtons = [
    // Các selector có thể tìm thấy nút "Vẫn đang xem" hoặc "Tiếp tục"
    'yt-button-renderer',
    'ytd-button-renderer',
    'paper-button',
    'button'
  ];

  for (const selector of confirmButtons) {
    const buttons = document.querySelectorAll(selector);
    
    for (const button of buttons) {
      // Kiểm tra nội dung text của button có chứa từ khóa liên quan
      const buttonText = button.innerText.toLowerCase();
      if (buttonText.includes('vẫn xem') || 
          buttonText.includes('tiếp tục') || 
          buttonText.includes('still watching') || 
          buttonText.includes('continue') || 
          buttonText.includes('confirm')) {
        console.log('YouTube Auto-Continue: Tìm thấy và click vào nút xác nhận');
        button.click();
        return true;
      }
    }
  }

  // Phương pháp khác: tìm dialog popup và đóng nó
  const dialogs = document.querySelectorAll('yt-confirm-dialog-renderer, tp-yt-paper-dialog');
  for (const dialog of dialogs) {
    if (dialog.style.display !== 'none') {
      const confirmButton = dialog.querySelector('#confirm-button, .yt-button-renderer, button');
      if (confirmButton) {
        console.log('YouTube Auto-Continue: Tìm thấy và click vào nút xác nhận trong dialog');
        confirmButton.click();
        return true;
      }
    }
  }

  return false;
}

// Phương pháp 2: Giữ video luôn chạy
function keepVideoPlaying() {
  // Kiểm tra trạng thái trước khi thực hiện
  if (!isEnabled) return;
  
  const videoElement = document.querySelector('video');
  if (videoElement && videoElement.paused) {
    console.log('YouTube Auto-Continue: Video bị dừng, đang tiếp tục phát');
    videoElement.play();
  }
}

// Kiểm tra định kỳ
function startMonitoring() {
  // Nếu đã có interval đang chạy, dừng nó trước
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  // Nếu không được bật, không làm gì cả
  if (!isEnabled) return;
  
  // Thực hiện kiểm tra mỗi 30 giây
  monitoringInterval = setInterval(() => {
    if (isEnabled) {
      autoClickContinueButton();
      keepVideoPlaying();
    }
  }, 30000);
  
  // Nếu đã có observer đang chạy, ngắt kết nối nó trước
  if (observerInstance) {
    observerInstance.disconnect();
  }
  
  // Thêm một observer để phát hiện các thay đổi DOM có thể là popup xuất hiện
  observerInstance = new MutationObserver((mutations) => {
    if (!isEnabled) return;
    
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        autoClickContinueButton();
      }
    }
  });
  
  // Theo dõi các thay đổi trong body
  observerInstance.observe(document.body, { 
    childList: true,
    subtree: true 
  });
  
  console.log('YouTube Auto-Continue: Đã bắt đầu theo dõi');
}