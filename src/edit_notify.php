<!DOCTYPE html>
<html lang="en">
<head>
<?php
	// dHouse
	// Notifications when device change
	// Jorge Elissalde 2025

	include("config.php");
	include("main_header.php");

	$device = $_REQUEST['device'];
	if (empty($device))
    	die("Data missing");
?>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notifications</title>
	<link rel='stylesheet' href='style/default.css'>
	<link rel='stylesheet' href='style/slider.css'>
	<link rel='stylesheet' href='style/select.css'>
	<link rel='stylesheet' href='style/messages.css'>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap">
</head>

<body>
	<?php include("messages.html"); ?>
    <div class="container" id="container">
	<!-- main box -->
        <?php placeMainHeader("Notifications",false,false) ?>
		<div style='height: 26px'></div>
		<img id="back-image" src="img/back.png" class='menuIconL0 gray-over' title='Go back'> 
		<img id="test-image" src="img/test.png" class='menuIconR0 gray-over' title='Send test'>
		</header>

		<!-- application settings -->
        <section id='buttons-section' class="section">
			<h2>Notifications</h2><br>
			<table cellpadding=0 cellspacing=0>
			<tr><td><label for="online_text">Online:</label></td>
			<tr>
				<td><input id="online_text" size="22" maxlength='50' type='text'></td>
				<td><label class='switch'>
					<input type='checkbox' id='online_switch'>
					<span class='slider round'></span>
					</label>
				</td>
			</tr>
			
			<tr><td><label for="offline_text">Offline:</label></td>
			<tr>
				<td><input id="offline_text" size="22" maxlength='50' type='text'></td>
				<td><label class='switch'>
					<input type='checkbox' id='offline_switch'>
					<span class='slider round'></span>
					</label>
				</td>
			</tr>

			<tr><td><label for='power_on'>Power On:</label></td>
			<tr>
				<td><input id="power_on" size="22" maxlength='50' type='text'></td>
				<td><label class='switch'>
					<input type='checkbox' id='poweron_switch'>
					<span class='slider round'></span>
					</label>
				</td>
			</tr>

			<tr><td><label for='power_off'>Power Off:</label></td>
			<tr>
				<td><input id="power_off" size="22" maxlength='50' type='text'></td>
				<td><label class='switch'>
					<input type='checkbox' id='poweroff_switch'>
					<span class='slider round'></span>
					</label>
				</td>
			</tr>
			</table>
		<br>
		<div class="settings" style="display: flex; justify-content: center; align-items: center; height: 52px">
		<button id='save-button' class='basic-button'> Save </button>&nbsp;&nbsp;
		<button id='close-button' class='basic-button'> Close </button>
		</div>
       </section>
    </div>

<script src='js/generic.js'></script>
<script src="js/mqtt_tasmota.js"></script>
<script src="js/edit_notify.js"></script>
<script src='js/messages.js'></script>
<script src="js/init_page.js"></script>
<script>
<?php include("set_jsenv.php");?>
const CMD_TEST_MESSAGE = <?=json_encode(CMD_TEST_MESSAGE);?>;
</script>
</body>
</html>

