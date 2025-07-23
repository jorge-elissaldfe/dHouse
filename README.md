# dHouse
Tasmota manager for Sonoff devices 

dHouse is an open-source application for managing Sonoff devices running the Tasmota firmware.
It is strongly inspired by the eWeLink software.

dHouse requires a Linux server to operate.
It uses the MQTT protocol to communicate with Sonoff devices.

Required third-party software:
    Avahi – for local network service discovery
    Mosquitto – as the MQTT broker
    SortableJS – for drag-and-drop UI functionality
    Ntfy – for push notifications for a cellphone
    SQLite3 - for data loggin

dHouse runs through a web interface built with PHP and JavaScript.
