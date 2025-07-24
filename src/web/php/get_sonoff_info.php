<?php
// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

include ("../config.php");
include ("../sonoff/post_sonoff.php");

if (!isset($_GET['ip']) || !isset($_GET['deviceid']))
	die("Missing parameters");

$ip = $_GET['ip'];
$deviceid = $_GET['deviceid'];

echo json_encode(getSonoffInfo ($ip,SONOFF_DIY_PORT,$deviceid));
?>

