#!/bin/bash
cd "$(dirname "$0")" || exit 1

PID_FILE=".app.pid"
LOG_FILE="app.log"
PORT=10170

start() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "⚠️ 이미 실행 중 (PID: $PID) — http://localhost:$PORT/data-designer/"
            return
        fi
    fi
    echo "📊 Data Designer 서버 시작…"
    node server.mjs >> "$LOG_FILE" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    disown -h $PID 2>/dev/null || true
    echo "✅ 시작됨 (PID: $PID) — http://localhost:$PORT/data-designer/"
}

stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        kill "$PID" 2>/dev/null
        sleep 0.5
        ps -p "$PID" > /dev/null 2>&1 && kill -9 "$PID" 2>/dev/null
        rm -f "$PID_FILE"
        echo "✅ 종료됨."
    else
        echo "ℹ️ 실행 정보 없음."
    fi
    fuser -k ${PORT}/tcp 2>/dev/null || true
}

status() {
    if [ -f "$PID_FILE" ] && ps -p "$(cat "$PID_FILE")" > /dev/null 2>&1; then
        echo "🟢 실행 중 (PID: $(cat "$PID_FILE")) — http://localhost:$PORT/data-designer/"
    else
        echo "⚪ 중지됨."
    fi
}

case "$1" in
    start) start ;;
    stop) stop ;;
    status) status ;;
    restart) stop; sleep 0.5; start ;;
    *) echo "사용법: $0 {start|stop|status|restart}"; exit 1 ;;
esac
