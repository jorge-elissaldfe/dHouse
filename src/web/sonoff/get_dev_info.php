<?php

$bypass_javascript_conf = true;

include ("../config.php");
include ("post_sonoff.php");

if (!isset($_GET['ip'])) //  || !isset($_GET['deviceid']))
	return null;

$ip = $_GET['ip'];
$deviceid = $_GET['deviceid'];
$port = SONOFF_DIY_PORT;

$r = getSonoffInfo ($ip, $port, $deviceid);
echo json_encode($r);

?>