#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Building frontend ==="
cd web
npm install
npm run build
cd ..

echo "=== Building Rust server (with embedded frontend) ==="
cargo build --release

echo "=== Build complete ==="
echo "Binary: target/release/mmpassword-server"
