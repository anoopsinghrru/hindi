/**
 * Real-time Leaderboard Polling Script
 * Periodically fetches updated rankings from /api/leaderboard-data every 5 seconds
 */

function fetchLeaderboardData() {
  fetch('/api/leaderboard-data')
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.leaderboard) {
        updateLeaderboardTable(data.leaderboard);
      }
    })
    .catch((err) => console.error('Leaderboard poll error:', err));
}

function updateLeaderboardTable(leaderboard) {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;

  if (leaderboard.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">कोई लीडरबोर्ड डेटा उपलब्ध नहीं है।</td></tr>';
    return;
  }

  const currentUserId = window.USER_ID || '';

  const rowsHtml = leaderboard
    .map((item) => {
      const isMyRow = item.name && item.name === window.USER_NAME ? 'my-rank-row' : '';
      return `
      <tr class="${isMyRow}">
        <td>${item.rank}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${item.score}</td>
        <td>${item.timeSpent}</td>
      </tr>
    `;
    })
    .join('');

  tbody.innerHTML = rowsHtml;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[m];
  });
}

// Attach function to global window
window.fetchLeaderboardData = fetchLeaderboardData;

// Start polling every 5 seconds if results screen is visible or user has completed
document.addEventListener('DOMContentLoaded', () => {
  // Initial fetch
  fetchLeaderboardData();

  // Set 5-second interval poll
  setInterval(fetchLeaderboardData, 5000);
});
