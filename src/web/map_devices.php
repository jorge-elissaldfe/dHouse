<!DOCTYPE html>
<html lang="en">
<head>
<?php
	// dHouse 
  	// Tasmota devices manager
  	// Jorge Elissalde 2025 

	session_start();
	include("config.php");
	include("main_header.php");
?>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>dHouse</title>
	<link rel="icon" href="favicon.ico" type="image/png">
	<link rel="stylesheet" href="style/default.css">
	<link rel="stylesheet" href="style/dropdown.css">
	<link rel="stylesheet" href="style/slider.css">
	<link rel="stylesheet" href="style/select.css">
	<link rel='stylesheet' href='style/messages.css'>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
</head>
<body>
	<?php include ("messages.html"); ?>
    <div class="container">
        <?php placeMainHeader("Devices Map",false, false)?>
		<div style='height: 26px'></div>
		<img id="back-image" src="img/back.png" class='menuIconL0 gray-over' title='Go back'>
		<img alt='Network search' id="net-search" src="img/net_search.png" title='Network search' class='menuIconR0 gray-over'> 
	</header>

		<!-- new Tasmota device detected popup box, intially hidden -->
		<section class="section-green" id="new_device_box" style="display: none">
			<div class="header-column" id="div_new_device"></div>
		</section>

		<!-- generic popup box -->
		<section class="section" id="generic_box" style="display: none">
			<div class="header" id="generic_box_data"></div>
		</section>

		<div id='scenes-shortcut'>
		</div>

		<!-- devices and actions -->
		<section class="section" style="margin-bottom: 3px">
        	<div id="device-list" style="margin-top: 7px; overflow-x: auto">
			</div>
			<br><span id='total-devices'></span>
			<div id='help_mqtt_color' style='display: none'>
			<br><br>
			<span style="display: inline-block; width: 1em; height: 1em; background-color: #cceeff; border: 1px solid #999999; vertical-align: middle"></span>
			&nbsp;Devices not connected to MQTT
			</div>
		</section>
    </div>

<script src="js/mqtt_tasmota.js"></script>
<script src="js/generic.js"></script>
<script src='js/messages.js'></script>
<script src="js/dom_utils.js"></script>
<script src="js/map_devices.js"></script>
<script src="js/init_page.js"></script>
<script>
<?php 
include("set_jsenv.php"); 

$server_ip = $_SERVER['SERVER_ADDR'] ?? '127.0.0.1';
$from = $to = "";
if (filter_var($server_ip, FILTER_VALIDATE_IP)) {
    $ip_parts = explode('.', $server_ip);
    if (count($ip_parts) === 4) {
        $base = "{$ip_parts[0]}.{$ip_parts[1]}.{$ip_parts[2]}";
        $from = "$base.1";
        $to = "$base.254";
	}
}
echo "const server_from = " . json_encode($from) . ";\n";
echo "const server_to = " . json_encode($to) . ";\n";
?>
</script>
</body>
</html>

