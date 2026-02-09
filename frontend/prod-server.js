import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3000
const DATA_DIR = path.resolve(__dirname, 'data')

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const server = http.createServer(async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.url === '/api/keys' && req.method === 'GET') {
    const filePath = path.join(DATA_DIR, 'keys.json')
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      res.setHeader('Content-Type', 'application/json')
      res.end(data)
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.end('[]')
    }
  } else if (req.url === '/api/keys' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const filePath = path.join(DATA_DIR, 'keys.json')
        fs.writeFileSync(filePath, body, 'utf-8')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true }))
      } catch (err) {
        res.statusCode = 500
        res.end(JSON.stringify({ success: false, error: err.message }))
      }
    })
  } else if (req.url === '/api/export' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const { filename, content } = JSON.parse(body)
        const filePath = path.join(DATA_DIR, filename)
        fs.writeFileSync(filePath, content, 'utf-8')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, path: filePath }))
      } catch (err) {
        res.statusCode = 500
        res.end(JSON.stringify({ success: false, error: err.message }))
      }
    })
  } else {
    res.statusCode = 404
    res.end('Not Found')
  }
})

server.listen(PORT, () => {
  console.log(`API Server running at http://localhost:${PORT}`)
})
