import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import tailwindcss from '@tailwindcss/vite';


// Plugin to generate assets.json
const generateAssetsJson = () => {
  return {
    name: 'generate-assets-json',
    closeBundle: async () => {
      const distDir = path.resolve(__dirname, 'dist')
      const files = []
      
      // Recursively get all files in dist directory
      const getFiles = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            getFiles(fullPath)
          } else {
            // Get relative path from dist directory
            const relativePath = path.relative(distDir, fullPath)
            // Skip assets.json itself
            if (relativePath !== 'assets.json') {
              files.push(relativePath)
            }
          }
        }
      }
      
      getFiles(distDir)
      
      // Write assets.json
      fs.writeFileSync(
        path.join(distDir, 'assets.json'),
        JSON.stringify({ files }, null, 2)
      )
      
      console.log('Generated assets.json with', files.length, 'files')
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    generateAssetsJson(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname)
    }
  },
  build: {
    // Generate sourcemaps so runtime errors map back to source during debugging
    sourcemap: true,
    // Disable minification for clearer stack traces while we diagnose the runtime error
    minify: false,
    // No rollupOptions.external!
  }
}) 