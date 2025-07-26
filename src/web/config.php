<?php
// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

// required for dhouse service
define("MQTT_SERVER", "172.20.0.170");
define("MQTT_PORT", 1883);

// sonoff port while running in diy
define("SONOFF_DIY_PORT", 8081);

// # of characters of sonoff device id
define("SONOFF_DEVICEID_LEN", 10);	

// avahi command to get mdns connected devices
define("AVAHI_COMMAND", "avahi-browse _ewelink._tcp -t --resolve"); // avahi-browse -v _ewelink._tcp --resolve -t"); // avahi-browse -a -r -t"); // avahi-browse _ewelink._tcp -t --resolve");

// available version for tasmota software
define("TASMOTA_LAST_VERSION","https://api.github.com/repos/arendst/Tasmota/tags");

// current release
define("TASMOTA_CURRENT_RELEASE",'http://ota.tasmota.com/tasmota/release/tasmota.bin');

// tasmota releases repository for upgrade
// ie:
// http://ota.tasmota.com/tasmota/release/tasmota-lite.bin
// http://ota.tasmota.com/tasmota/release/tasmota-minimal.bin
define("TASMOTA_REPOSITORY", "http://ota.tasmota.com/tasmota/release/");

// firmware to install the very first time: 9.5
// I've have had issues installing last tasmota release as the first firmware
define("TASMOTA_FIRST_FIRMWARE", "http://ota.tasmota.com/tasmota/release-9.5.0/");	

// module type for SonOff Bridge
// defined at Tasmota configuration 
define("BRIDGE_MODULE", "Sonoff Bridge");

// dHouse main configuration file
define("DHOUSE_CONFIG", "/config/dhouse.config");


// experimental features
// let user setup sleep time
// change from default is not really recomended 
// device 'button press' could be lost if sleep time is too high
define("EXPERIMENTAL_SET_SLEEP_TIME", false);

// manually set template data string
define("EXPERIMENTAL_SET_TEMPLATE", true);

// hold time for button action
define("EXPERIMENTAL_BUTTON_HOLD", false);

/** commands sent from web interfase to dhouse service **/
define("CMD_TEST_MESSAGE", "SendTestMessage");
define("CMD_RUN_SCENE", "RunScene");
define("CMD_RELOAD", "ReloadConfig");

// log database
define("LOG_DATABASE", "../../db/dhouse.db");

$tasmota_releases = array("bin","4M","display","ir","knx","lite","sensors","zbbridge","zigbee");

// store current configuration into json server file
function store_dhouse_config() {
	global $config;

	$js = json_encode($config, JSON_PRETTY_PRINT);
	$fp = fopen("config/dhouse.config", 'w');
	fwrite($fp, $js);
	fclose($fp);
	$_SESSION['config'] = $config;
}

// retrieve configuration from local json file
function get_dhouse_config() {
	global $config;
	global $js_config;

	$js = file_get_contents("config/dhouse.config");
	$config = json_decode($js, true);
	$js_config = json_encode($config);
}

// get a list of icons and build a javascript select 
function place_js_iconarray() {
	$js_array = "const icons = [";
	$d = scandir("img/devices",SCANDIR_SORT_ASCENDING);
	$nfiles = 0;

	foreach ($d as $file) {
		// only png files
		if (strcasecmp(substr($file, strlen($file)-4), ".png")==0) {
			if ($nfiles > 0)
				$js_array = $js_array . ", ";
			++$nfiles;
			$js_array = $js_array . "\"$file\"";
		}
	}
	$js_array = $js_array . "];\n";
	echo $js_array;
}
?>