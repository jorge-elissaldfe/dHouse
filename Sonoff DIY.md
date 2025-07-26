Sonoff DIY

dHouse allows a Sonoff DIY device to be detected and updated with Tasmota firmware.

DIY mode from Sonoff

- Long press the button for 5 seconds to enter pairing mode, then press another 5 seconds to enter Compatible Pairing Mode (AP). The LED indicator should blink continuously.
- From mobile phone or PC WiFi setting, an Access Point of the device named ITEAD-XXXXXXXX will be found, connect it with default password 12345678
- Open the browser and access to the ip address 10.10.7.1
- Fill WiFi SSID and password. Once successfully connected, the device is in DIY mode.
- When the device restarts you will be able to find it using Range Search or mDNS Search
- Install Tasmota software and then look for a Wifi Access Point named: tasmota_xxxxx. Connect to this network and access to the IP Address: 192.168.4.1 for Wifi and mqtt server configuration

Excerpt from: Sonoff DIY-Tasmota - https://tasmota.github.io/docs/Sonoff-DIY/#compatible-devices

Important:

Some devices requires a template to correctly enable buttons and functions.
Check Tasmota Templates - (https://templates.blakadder.com/)

dHouse can detect a device running in Sonoff DIY mode using mDNS search or network search.
Look for "Install Tasmota Firmware" option under main menu.

<img width="699" height="427" alt="image" src="https://github.com/user-attachments/assets/9953600b-b517-4a42-9e3c-20964596ae92" />

-
- You can install Tasmota firmware when the device is detected.
-

<img width="680" height="677" alt="image" src="https://github.com/user-attachments/assets/61d222e9-f9e2-44a1-903b-8f8c21ecc5fc" />

-
- The firmware version 9.5 will be installed as the first firmware.
- You will able to upgrade it to the last version later.
-

<img width="681" height="804" alt="image" src="https://github.com/user-attachments/assets/6951fc1e-6323-42c3-866a-c9ab51395994" />

-
- After install Tasmota firmware and Wifi settings, you can automatically set MQTT server.
- Use dHouse menu option: "Devices map" and then "Network search" feature.
- 

<img width="684" height="876" alt="image" src="https://github.com/user-attachments/assets/8d720be7-9576-41e8-ad0b-b224d79b82bb" />

-
- After configuring MQTT server, you will see the new device listed on main dHouse scren:
-

<img width="707" height="520" alt="image" src="https://github.com/user-attachments/assets/3f26642d-8ac6-4af5-88bc-f3724a63e382" />

-
- After configuring the device, you will see the new version available notice:
-

<img width="686" height="322" alt="image" src="https://github.com/user-attachments/assets/2b2e6f01-fe48-418e-8582-b472c5b87692" />

-
- The last Tasmota available firmware will be installed.
-

<img width="648" height="424" alt="image" src="https://github.com/user-attachments/assets/451e709b-e551-40fb-acea-b12dadf1d9f3" />

