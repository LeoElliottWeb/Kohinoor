import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'maskable-icon.svg'],

            workbox: {
                runtimeCaching: [
                    {
                        urlPattern: /\/api\/.*/i,
                        handler: 'NetworkOnly',
                        options: {
                            backgroundSync: {
                                name: 'chess-moves-queue',
                                options: {
                                    maxRetentionTime: 24 * 60
                                }
                            }
                        }
                    }
                ]
            },

            manifest: {
                id: '/',
                name: 'chessOnline.eu.com',
                short_name: 'chessOnline',
                description: 'Play live chess matches online',
                theme_color: '#1a1a1a',
                background_color: '#1a1a1a',
                display: 'standalone',
                orientation: 'portrait',
                categories: ["games", "entertainment", "sports"],
                dir: 'ltr',
                lang: 'en',

                display_override: ['tabbed', 'window-controls-overlay', 'standalone'],

                prefer_related_applications: false,
                related_applications: [
                    {
                        platform: "play",
                        url: "https://play.google.com/store/apps/details?id=chessOnline.eu.com",
                        id: "chessOnline.eu.com"
                    }
                ],

                iarc_rating_id: 'e84b072d-71b3-4d3e-86ae-31a8ce4e53b7',

                // --- Strictly Compliant Scope Extensions ---
                scope_extensions: [
                    {
                        type: "origin",
                        origin: "https://*.chessonline.eu.com"
                    },
                    {
                        type: "origin",
                        origin: "https://chessonline.eu.com"
                    }
                ],

                launch_handler: {
                    client_mode: ["focus-existing", "navigate-new"]
                },

                protocol_handlers: [
                    {
                        protocol: "web+chess",
                        url: "/?match=%s"
                    }
                ],

                share_target: {
                    action: "/",
                    method: "GET",
                    params: {
                        title: "title",
                        text: "text",
                        url: "url"
                    }
                },

                note_taking: {
                    new_note_url: "/"
                },

                widgets: [
                    {
                        name: "Chess Online Match Status",
                        short_name: "Match Status",
                        description: "View your active chess matches directly from your OS widgets dashboard.",
                        tag: "chess-widget",
                        ms_ac_template: "/widget-template.json",
                        data: "/widget-data.json",
                        icons: [
                            {
                                src: "/pwa-192x192.png",
                                sizes: "192x192",
                                type: "image/png"
                            }
                        ]
                    }
                ],

                edge_side_panel: {
                    preferred_width: 400
                },

                shortcuts: [
                    {
                        name: "Play Match",
                        short_name: "Play",
                        description: "Start a new chess match",
                        url: "/",
                        icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }]
                    }
                ],

                file_handlers: [
                    {
                        action: "/",
                        accept: {
                            "application/x-chess-pgn": [".pgn"]
                        }
                    }
                ],

                icons: [
                    {
                        src: '/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: '/maskable-icon.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ],
                screenshots: [
                    {
                        src: '/screenshot-mobile.png',
                        sizes: '1891x898',
                        type: 'image/png',
                        form_factor: 'narrow'
                    },
                    {
                        src: '/screenshot-desktop.png',
                        sizes: '1920x1920',
                        type: 'image/png',
                        form_factor: 'wide'
                    }
                ]
            }
        })
    ]
})