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
        <?php placeMainHeader("Map Devices",false, false)?>
		<div style='height: 26px'></div>
		<img id="back-image" src="img/back.png" class='menuIconL0 gray-over' title='Go back'>
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
			<br>Total devices: <span id='total-devices'></span>
		</section>
    </div>

<script src="js/mqtt_tasmota.js"></script>
<script src="js/generic.js"></script>
<script src='js/messages.js'></script>
<script src="js/dom_utils.js"></script>
<script src="js/map_devices.js"></script>
<script src="js/init_page.js"></script>
<script>
<?php include("set_jsenv.php"); ?>
const CMD_RUN_SCENE = <?=json_encode(CMD_RUN_SCENE);?>;
</script>
</body>
</html>

