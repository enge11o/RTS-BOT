@echo off
setlocal
cd /d "%~dp0"
if not exist dist (
  echo [!] dist folder not found. Please run: npm run build
  pause
  exit /b 1
)
pushd dist
set PORT=8080
echo Trying to serve on http://localhost:%PORT%
python -c "import http.server, socketserver, webbrowser; port=%PORT%; Handler=http.server.SimpleHTTPRequestHandler; httpd=socketserver.TCPServer(('',port),Handler); print('Serving on http://localhost:%PORT%'); webbrowser.open('http://localhost:%PORT%'); httpd.serve_forever()" 2>nul
if errorlevel 1 (
  echo [!] Python not found. Install Python or use: npm run preview
  popd
  pause
  exit /b 1
)
popd
endlocal