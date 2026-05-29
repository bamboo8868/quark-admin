const config = {
  siteName: '高能电玩',
  siteNameEn: '高能电玩',
  siteNameZh: '高能电玩',
  siteLogo: 'G',
  siteDescription: '发现精彩游戏，连接全球玩家',
}

// Derived parts for split-color logo display
const parts = config.siteNameEn.split(' ')
config.siteNameHighlight = parts[0]      // e.g. "Game" — gradient color
config.siteNameNormal = parts.slice(1).join(' ')  // e.g. "Community" — plain color

export default config
