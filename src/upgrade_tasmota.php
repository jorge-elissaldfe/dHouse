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

	$forceUpgrade = isset($_REQUEST['force']) ? true:false;
	$device = $_REQUEST['device'];
	if (empty($device))
    	die("Data missing");
	if (empty($_SESSION['tasmota_firmware']))
		die("Missing new firmware version");
	$newFirmware = $_SESSION['tasmota_firmware'];
?>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Firmware Upgrade</title>
	<link rel='stylesheet' href='style/default.css'>
	<style type='text/css'>
		.truncate-cell {
    		max-width: 180px; 
    		white-space: nowrap;
    		overflow: hidden;
    		text-overflow: ellipsis;
  		}
	</style>
</head>
<body>
	<div class="container">
	<?php placeMainHeader("Firmware Upgrade", false, false) ?>
	<div style='height: 26px'></div>
	<img id="back-image" src="img/back.png" class='menuIconL0 gray-over' title='Go back'>
	</header>
		<section class="section"> 
			<table>
				<tr><td colspan=2><strong>Upgrade Device Firmware</strong><br><br></td></tr>
				<tr><td>Device:</td><td id='friendly_name'></td></tr> 
				<tr><td>Current firmware:</td><td class='truncate-cell' id="current_firmware"></td></tr>
				<tr><td>New firmware:</td><td><?=$newFirmware?></td></tr> 
				<tr><td style='display:none' colspan=2 id='go-button'><br>
					<button class='basic-button' id='upgrade-button'>Upgrade </button></td>
				</tr> 
			</table>
			<br>
			<div id='upgrade-message'></div>
			<div id='close-button-div' style='display: none'>
				<br>
				<button id="button-close" class='basic-button'> Close </button>
			</div>
		</section> 
	</div>

<!-- <script src='js/mqtt.js'></script> -->
<script src='js/mqtt_tasmota.js'></script>
<script src='js/generic.js'></script>
<script src='js/tasmota.js'></script>
<script src='js/upgrade_tasmota.js'></script>
<script src="js/init_page.js"></script>
<script>
<?php include("set_jsenv.php"); ?>
const TASMOTA_CURRENT_RELEASE = <?php echo json_encode(TASMOTA_CURRENT_RELEASE); ?>;
const newFirmware = <?php echo json_encode($_SESSION['tasmota_firmware']); ?>;
const forceUpgrade = <?php echo json_encode($forceUpgrade); ?>;
</script>
</body>
</html>



