# Run this script from your desktop to setup a Raspberry Pi 4 Model B running
# Raspberry Pi OS.

sudo apt install xdotool unclutter

# Install Rust.
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone the repo.
git clone https://github.com/tvolk131/lightning_vend.git

# Build the command executor server from source.
cd lightning_vend/command_executor_server
cargo build --release

# Move the binary to the home directory.
mv target/release/command_executor_server ~

# Create a script to run Chromium in kiosk mode.
tee ~/kiosk.sh << EOF
#!/bin/bash

xset s noblank
xset s off
xset -dpms

unclutter -idle 0.5 -root &

sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' /home/admin/.config/chromium/Default/Preferences
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' /home/admin/.config/chromium/Default/Preferences

/usr/bin/chromium-browser --kiosk --start-fullscreen --noerrdialogs --disable-infobars https://lightningvend.com/device &

while true; do
   xdotool keydown ctrl; xdotool keyup ctrl;
   sleep 10
done

EOF

# Create systemd service file for command executor server.
sudo tee /etc/systemd/system/command_executor_server.service << EOF
[Unit]
Description=LightningVend Command Executor
Before=kiosk.service

[Service]
User={user}
Group={user}
Type=simple
ExecStart=/home/{user}/command_executor_server
Restart=always
RestartSec=1

[Install]
WantedBy=default.target

EOF

# Replace {user} with your username.
sed -i "s/{user}/$USER/g" /etc/systemd/system/command_executor_server.service

# Enable the command executor server to run on boot.
sudo systemctl enable command_executor_server.service

# Create systemd service file for Chromium kiosk.
sudo tee /etc/systemd/system/kiosk.service << EOF
[Unit]
Description=LightningVend Chromium Kiosk
Wants=graphical.target
After=graphical.target

[Service]
User={user}
Group={user}
Type=simple
ExecStart=/bin/bash /home/{user}/kiosk.sh
Restart=on-abort
Environment=DISPLAY=:0.0
Environment=XAUTHORITY=/home/{user}/.Xauthority

[Install]
WantedBy=graphical.target

EOF

# Replace {user} with your username.
sed -i "s/{user}/$USER/g" /etc/systemd/system/kiosk.service

# Enable the Chromium kiosk to run on boot.
sudo systemctl enable kiosk.service

# Update the package manager.
sudo apt update

# Upgrade the system.
sudo apt full-upgrade

# Set system to login automatically.
sudo raspi-config nonint do_boot_behaviour B4

# Reboot.
sudo reboot
