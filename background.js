// background.js - service worker (runs when needed)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    let title = 'Student Buddy';
    let message = 'Time!';
    // fetch stored reminders/pomodoros to find message text
    const res = await new Promise(resolve => chrome.storage.local.get(['reminders','pomodoros'], resolve));
    if (alarm.name.startsWith('rem_')) {
      const rem = (res.reminders || []).find(r => r.id === alarm.name);
      message = rem ? rem.text : 'Reminder';
      title = 'Reminder';
      // remove reminder from storage (one-shot)
      const newRem = (res.reminders || []).filter(r => r.id !== alarm.name);
      chrome.storage.local.set({ reminders: newRem });
    } else if (alarm.name.startsWith('pom_')) {
      message = 'Pomodoro finished — take a break!';
      title = 'Pomodoro';
      // remove finished pomodoro entry
      const newPom = (res.pomodoros || []).filter(p => p.id !== alarm.name);
      chrome.storage.local.set({ pomodoros: newPom });
    }

    // create notification
    chrome.notifications.create(alarm.name, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message
    });

    // optional: set a small badge to catch user attention
    chrome.action.setBadgeText({ text: '●' });
    setTimeout(()=> chrome.action.setBadgeText({ text: '' }), 5000);
  } catch (err) {
    console.error('alarm handler error', err);
  }
});

// when user clicks notification, open a helpful page (here we open extension's page in chrome extensions UI)
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
  chrome.notifications.clear(notificationId);
  chrome.action.setBadgeText({ text: '' });
});
