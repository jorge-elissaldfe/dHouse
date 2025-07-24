<?php

// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

include("../config.php");
include("../sonoff/post_sonoff.php");
include("generic.php");

if (!isset($_GET['ip']) || !isset($_GET['deviceid']) || !isset($_GET['tasmota_filename']) || !isset($_GET['firmware_url']))
	die("Missing parameters");

$ip = $_GET['ip'];
$deviceid = $_GET['deviceid'];
$tasmota_filename = $_GET['tasmota_filename'];
$firmware_url = $_GET['firmware_url'];

// download firmware file to calculate sha256
// if (($tasmota_version=getTasmotaVersion())==false) {
//	echo "Could not retrieve Tasmota current release<br>";
//	return;
//}
	
$local_filename = "../tmp/$tasmota_filename";
$httpcode = download_file($firmware_url,$local_filename);
if ($httpcode != 200) {
	if ($httpcode == 0)
		echo "Could not create local file: ${local_filename} for firmware download.<br>Check <b>[tmp]</b> folder permissions.";
	else
		echo "Could not fetch Tasmota firmware from the url";
	return;
}

// get sha256
if (($sha256=hash_file('sha256', $local_filename))===false) {
	echo "Could not get sha256sum for the downloaded firmware";
	return;
}

$result = otaInstallFirmware($ip, SONOFF_DIY_PORT, $deviceid, $firmware_url, $sha256);
if ($result == null || $result["error"]!=0) {
	echo "Could not install firmare</b><br>";
	if ($result != null)
		echo "Sonoff return error: " . $result["error"];
	echo "<br><br>Please check Tasmota release and choose the right one for the Sonoff device";
	return;
}
echo "Done";
?>