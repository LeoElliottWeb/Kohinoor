import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    // 👇 CHANGE THIS TO YOUR EXACT GITHUB REPOSITORY NAME
    base: '/Kohinoor/',

    plugins: [react()]
})