// const { ImapFlow } = require('imapflow');
import { ImapFlow } from 'imapflow';

const config = {
  host: 'imap.qq.com',
  port: 993,
  secure: true,
  auth: {
    user: '930133449@qq.com',
    pass: 'moavtxukbfrybdje'
  },
  logger: false
};

const client = new ImapFlow(config);

let prevCount = 0; // 上一次邮件总数

// 监听 EXISTS 事件（核心）
function now() {
  return new Date().toLocaleString();
}

// ====================== 监听 EXISTS（修复版） ======================
client.on('exists', async () => {
  try {
    console.log(`\n[${now()}] 📩 收到新邮件 EXISTS 通知`);

    // 必须加锁！否则会报错：lock is required for this operation
    const lock = await client.getMailboxLock('INBOX');
    try {
      // 获取最新一封邮件
      const latest = await client.fetchOne('*', {
        envelope: true,
        source: true
      });
      
      // 输出信息
      console.log('========================================');
      console.log('📬 最新一封邮件：');
      console.log('接收时间：', now());
      console.log('主题：', latest.envelope.subject || '无主题');
      console.log('发件人：', latest.envelope.from?.[0].address);
      console.log('发送时间：', latest.envelope.date);
      console.log('正文预览：', (latest.source || '无正文').slice(0, 100));
      console.log('正文预览：', (latest));
      console.log('========================================');

    } finally {
      lock.release(); // 必须释放锁
    }

  } catch (err) {
    console.error('❌ 处理邮件出错：', err.message);
  }
});

client.on('error', (err) => {
  console.error('❌ 连接错误：', err);
});

client.on('close', () => {
  console.log('🔌 连接断开，3秒后重连...');
  setTimeout(start, 3000);
});

async function start() {
  try {
    await client.connect();
    console.log('✅ 已连接 QQ 邮箱');

    await client.mailboxOpen('INBOX');
    console.log('📂 已打开收件箱');

    // 初始化当前邮件总数
    const status = await client.status('INBOX', { messages: true });
    prevCount = status.messages;
    console.log(`🔍 初始邮件总数：${prevCount}`);

    // ImapFlow 默认自动进入 IDLE，无需手动调用 client.idle()
    // 只要连接空闲，就会自动 IDLE，持续推送 EXISTS
  } catch (err) {
    console.error('❌ 启动失败：', err);
  }
}

start();