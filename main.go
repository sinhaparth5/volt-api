package main

import (
	"embed"
	"net/http"
	"runtime"

	"volt-api/internal/app"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	application := app.New()

	// Create application with options
	err := wails.Run(&options.App{
		Title:     "Volt API",
		Width:     1024,
		Height:    768,
		MinWidth:  800,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
			Middleware: func(next http.Handler) http.Handler {
				return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.Header().Set("Content-Security-Policy",
						"default-src 'self'; "+
							"script-src 'self' 'unsafe-inline' 'unsafe-eval'; "+
							"style-src 'self' 'unsafe-inline'; "+
							"img-src 'self' data: blob: https: http:; "+
							"connect-src 'self'; "+
							"font-src 'self' data:; "+
							"object-src 'none'; "+
							"base-uri 'self'; "+
							"frame-src 'self' blob: data:;",
					)
					w.Header().Set("X-Content-Type-Options", "nosniff")
					w.Header().Set("X-Frame-Options", "SAMEORIGIN")
					w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
					next.ServeHTTP(w, r)
				})
			},
		},
		EnableDefaultContextMenu: !productionMode,
		BackgroundColour: &options.RGBA{R: 30, G: 30, B: 46, A: 1}, // ctp-base
		Frameless:        runtime.GOOS == "windows",                // Frameless on Windows for custom title bar
		OnStartup:        application.Startup,
		OnShutdown:       application.Shutdown,
		Bind: []interface{}{
			application,
		},
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			DisableWindowIcon:    false,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
