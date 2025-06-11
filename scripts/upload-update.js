import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Get version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'))
const version = packageJson.version

if (!version) {
  console.error('Error: No version found in package.json')
  process.exit(1)
}

// Generate a simple hash for the version
const hash = Buffer.from(version).toString('base64').slice(0, 8)

async function uploadUpdate() {
  try {
    console.log(`🚀 Uploading version ${version}...`)

    // 1. Build the app
    console.log('📦 Building app...')
    execSync('npm run build', { stdio: 'inherit' })

    const distDir = path.join(__dirname, '../dist')
    const versionDir = `updates/${version}`

    // 2. Upload all files to versioned directory
    console.log('📤 Uploading files...')
    const files = []
    const uploadFile = async (filePath) => {
      const relativePath = path.relative(distDir, filePath)
      const targetPath = `${versionDir}/${relativePath}`
      
      const fileContent = fs.readFileSync(filePath)
      const { error } = await supabase.storage
        .from('updates')
        .upload(targetPath, fileContent, {
          contentType: getContentType(filePath),
          upsert: true
        })

      if (error) throw error
      files.push(relativePath)
    }

    // Recursively upload all files
    const uploadDir = async (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await uploadDir(fullPath)
        } else {
          await uploadFile(fullPath)
        }
      }
    }

    await uploadDir(distDir)
    console.log(`✅ Uploaded ${files.length} files`)

    // 3. Create/update version.json
    const versionJson = {
      version,
      hash,
      url: `${supabaseUrl}/storage/v1/object/public/updates/${version}/`
    }

    const { error: versionError } = await supabase.storage
      .from('updates')
      .upload('version.json', JSON.stringify(versionJson, null, 2), {
        contentType: 'application/json',
        upsert: true
      })

    if (versionError) throw versionError

    console.log('✅ Updated version.json')
    console.log('\n🎉 Update uploaded successfully!')
    console.log(`Version: ${version}`)
    console.log(`Hash: ${hash}`)
    console.log(`URL: ${versionJson.url}`)

  } catch (error) {
    console.error('❌ Error uploading update:', error)
    process.exit(1)
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
  }
  return contentTypes[ext] || 'application/octet-stream'
}

uploadUpdate()