@echo off
setlocal
title 回路工坊 CircuitCraft
cd /d "%~dp0"

REM ---- 环境检查 ----
where node >nul 2>nul
if errorlevel 1 goto no_node

if exist node_modules goto menu
echo [*] 首次运行：正在安装依赖，约 2-5 分钟...
call npm install --no-audit --no-fund
if errorlevel 1 goto install_fail

:menu
echo.
echo  ==========================================
echo    回路工坊 CircuitCraft 启动器
echo  ==========================================
echo    [1] 开发模式 - 热更新, 默认端口 5173
echo    [2] 生产模式 - 构建 + 本地服务器, 需 MySQL
echo    [3] 仅重新构建前端
echo  ==========================================
choice /c 123 /n /m " 请选择 [1-3]: "
if errorlevel 3 goto buildonly
if errorlevel 2 goto prod

:dev
echo [*] 启动开发服务器, Ctrl+C 停止...
call npm run dev
goto end

:prod
if exist dist\boot.js goto prod_run
echo [*] 未发现构建产物, 先执行构建...
call npm run build
if errorlevel 1 goto build_fail

:prod_run
echo [*] 启动生产服务器, Ctrl+C 停止...
call npm run start
goto end

:buildonly
call npm run build
if errorlevel 1 goto build_fail
echo [OK] 构建完成, 输出在 dist 目录
goto end

:no_node
echo [X] 未检测到 Node.js, 请先安装: https://nodejs.org
pause
exit /b 1

:install_fail
echo [X] 依赖安装失败, 请检查网络后重试。
pause
exit /b 1

:build_fail
echo [X] 构建失败。
pause
exit /b 1

:end
endlocal
