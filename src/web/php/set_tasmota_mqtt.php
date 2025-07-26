<?php
// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if (!isset($_GET['ip']))
	die("Missing parameter");

require("../config.php");

// set mqtt server
$ip = $_GET['ip'];
$url = "http://$ip/cm?cmnd=MqttHost%20" . MQTT_SERVER;
$response = file_get_contents($url);

// set mqtt port
$url = "http://$ip/cm?cmnd=MqttPort%20" . MQTT_PORT;
$response .= file_get_contents($url);
echo $response;

?>