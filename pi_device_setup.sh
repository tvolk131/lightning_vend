# Use the Raspberry Pi Imager to flash the latest version of
# "Raspberry Pi OS (64-bit)" which is in the "Raspberry Pi OS (other)" section.
# Once on the desktop, place this file anywhere and run the following command:
#   sudo bash pi_device_setup.sh
# This will install all of the dependencies, clone the repo, build the command
# executor server, and setup the system to run the command executor server and
# Chromium UI on boot.

# Exit early if any command fails.
set -e

# Set the user variable to the current user (as opposed to root).
ORIGINAL_USER=${SUDO_USER:-$USER}

# Install dependencies.
apt -y install xdotool unclutter

# Install Rust.
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
# Add Rust to the path (so we can continue in the same shell).
source "$HOME/.cargo/env"

# Clone the repo.
# TODO: Currently we're ignoring the error if the repo already exists. This
# should be changed to pull the latest changes instead.
git clone https://github.com/tvolk131/lightning_vend.git || true

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

sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' /home/{user}/.config/chromium/Default/Preferences
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' /home/{user}/.config/chromium/Default/Preferences

/usr/bin/chromium-browser --kiosk --start-fullscreen --noerrdialogs --disable-infobars https://lightningvend.com/device &

while true; do
   xdotool keydown ctrl; xdotool keyup ctrl;
   sleep 10
done

EOF

# Replace {user} with your username.
sed -i "s/{user}/$ORIGINAL_USER/g" ~/kiosk.sh

# Create systemd service file for command executor server.
tee /etc/systemd/system/command_executor_server.service << EOF
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
sed -i "s/{user}/$ORIGINAL_USER/g" /etc/systemd/system/command_executor_server.service

# Enable the command executor server to run on boot.
systemctl enable command_executor_server.service

# Create systemd service file for Chromium kiosk.
tee /etc/systemd/system/kiosk.service << EOF
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
sed -i "s/{user}/$ORIGINAL_USER/g" /etc/systemd/system/kiosk.service

# Enable the Chromium kiosk to run on boot.
systemctl enable kiosk.service

# Set system to login automatically.
raspi-config nonint do_boot_behaviour B4

# Print to the console that the setup is complete and the system should be
# rebooted.
echo "Setup complete. Please reboot the system by running the following command:"
echo "sudo reboot"
