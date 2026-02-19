import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    {
      name: 'api-server',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/keys' && req.method === 'GET') {
            const filePath = path.resolve(__dirname, 'data/keys.json')
            if (fs.existsSync(filePath)) {
              const data = fs.readFileSync(filePath, 'utf-8')
              res.setHeader('Content-Type', 'application/json')
              res.end(data)
            } else {
              res.end('[]')
            }
          } else if (req.url === '/api/keys' && req.method === 'POST') {
            let body = ''
            req.on('data', chunk => body += chunk)
            req.on('end', () => {
              const filePath = path.resolve(__dirname, 'data/keys.json')
              if (!fs.existsSync(path.dirname(filePath))) {
                fs.mkdirSync(path.dirname(filePath), { recursive: true })
              }
              fs.writeFileSync(filePath, body, 'utf-8')
              res.end(JSON.stringify({ success: true }))
            })
          } else if (req.url === '/api/export' && req.method === 'POST') {
            let body = ''
            req.on('data', chunk => body += chunk)
            req.on('end', () => {
              const { filename, content } = JSON.parse(body)
              const filePath = path.resolve(__dirname, 'data', filename)
              if (!fs.existsSync(path.dirname(filePath))) {
                fs.mkdirSync(path.dirname(filePath), { recursive: true })
              }
              fs.writeFileSync(filePath, content, 'utf-8')
              res.end(JSON.stringify({ success: true, path: filePath }))
            })
          } else if (req.url === '/api/config' && req.method === 'GET') {
            const filePath = path.resolve(__dirname, 'data/config.json')
            if (fs.existsSync(filePath)) {
              const data = fs.readFileSync(filePath, 'utf-8')
              res.setHeader('Content-Type', 'application/json')
              res.end(data)
            } else {
              // 默认开启验证
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ enableVerification: true }))
            }
          } else if (req.url === '/api/config' && req.method === 'POST') {
            let body = ''
            req.on('data', chunk => body += chunk)
            req.on('end', () => {
              try {
                const filePath = path.resolve(__dirname, 'data/config.json')
                if (!fs.existsSync(path.dirname(filePath))) {
                  fs.mkdirSync(path.dirname(filePath), { recursive: true })
                }
                // 简单校验一下 JSON
                JSON.parse(body)
                fs.writeFileSync(filePath, body, 'utf-8')
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true }))
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ success: false, error: (err as Error).message }))
              }
            })
          } else {
            next()
          }
        })
      }
    }
  ],
})
