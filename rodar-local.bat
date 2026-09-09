@echo off
title LP Dra. Camilla Barros - servidor local
cd /d "%~dp0"

echo.
echo  LP Dra. Camilla Barros
echo  ----------------------
echo.

if not exist node_modules (
  echo  Primeira vez: instalando as dependencias. Isso leva 1 a 3 minutos.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  Falhou a instalacao. Confira se o Node esta instalado: node -v
    pause
    exit /b 1
  )
)

echo.
echo  Subindo o site em http://localhost:5173
echo  O painel fica em http://localhost:5173/admin
echo.
echo  Sem banco de dados rodando, o site abre com o conteudo padrao
echo  do arquivo client/src/data/defaults.js. E o suficiente para ver
echo  o layout. O painel /admin so funciona com o Postgres ligado.
echo.
echo  Para parar o servidor: Ctrl+C nesta janela.
echo.

start "" http://localhost:5173
call npm run dev

pause
