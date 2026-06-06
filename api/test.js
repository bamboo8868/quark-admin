// index.js
import fastify from 'fastify'

const app = fastify({ logger: true })

// 路由组：/api，所有路由共用 preHandler
app.register(async (instance) => {
  // 👇 这个 hook 只对当前“组”生效
  instance.addHook('preHandler', async (request, reply) => {
    if (!request.headers.token) {
      return reply.code(401).send({ message: '未登录' })
    }
  })

  // 组内路由
  instance.get('/user', async () => ({ user: 'ok' }))
  instance.get('/order', async () => ({ order: 'ok' }))

}, { prefix: '/api' }) // 👈 统一前缀

// 启动
const start = async () => {
  try {
    await app.listen({ port: 3000 })
    console.log('运行在 http://localhost:3000')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}
start()