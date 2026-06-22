'use strict';

const toggle = document.getElementById('toggle');
const statusEl = document.getElementById('status');

function updateStatus(enabled) {
  statusEl.textContent = enabled ? 'Ativo' : 'Desativado';
  statusEl.classList.toggle('active', enabled);
}

chrome.storage.local.get({ enabled: true }, (result) => {
  toggle.checked = result.enabled;
  updateStatus(result.enabled);
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ enabled }, () => {
    updateStatus(enabled);
  });
});
