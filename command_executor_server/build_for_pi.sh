sudo apt-get update
sudo apt-get install -y gcc-arm-linux-gnueabihf
rustup target add armv7-unknown-linux-gnueabihf
cargo build --release --target=armv7-unknown-linux-gnueabihf
