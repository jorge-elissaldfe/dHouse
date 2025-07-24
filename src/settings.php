<!DOCTYPE html>
<html lang="en">
<head>
<?php
	// dHouse
	// Default Settings
	// Jorge Elissalde 2025

	session_start();
	include("config.php");
	include("main_header.php");

?>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings</title>
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
        <?php placeMainHeader("Settings",false,false)?>
		<div style='height: 26px'></div>
		<img id="back-image" src="img/back.png" class='menuIconL0 gray-over' title='Go back'>
		</header>

		<!-- application settings -->
        <section id='buttons-section' class="section">
			dHouse Name:<br>
			<input size="25" maxlength='100'  type='text' id='dhouse_name' name='dhouse_name'><br><br>
			<table>
			<tr><td><label for='show_scenes_bar'>Show Scenes bar:</label></td>
				<td>
					<label class='switch'>
					<input type='checkbox' id='show_scenes_bar'>
					<span class='slider round'></span>
					</label>
				</td>
			</tr>
			<tr><td><label for='show_average'>Show load:</label></td>
				<td>
					<label class='switch'>
					<input type='checkbox' id='show_average'>
					<span class='slider round'></span>
					</label>
					<font size=2>&nbsp;(device cpu load)</font>
				</td>
			</tr>
<?php if (EXPERIMENTAL_SET_SLEEP_TIME) { ?>
			<tr><td>Default Sleep Time:</td>
				<td><select id='sleep_time'>
					<option value='50'>50</option>
					<option value='100'>100</option>
					<option value='200'>200</option>
					</select>
				</td>
				<td><font size=-2>Check Tasmota <a href='https://tasmota.github.io/docs/Dynamic-Sleep/'>Dynamic Sleep</a> for this setting<br>Higher values might cause missed or delayed switch or button detection</td>
			</tr>
<?php } ?>
			<tr><td colspan=2></td></tr>

		<tr><td></td></tr>
		</table>

		<fieldset>
			<legend>Device location</legend>
			<table>
			<tr><td>Time zone:</td>
				<td><select style='width:auto;' id='timezone' name='time_zone'>
				</select></td>
			</tr>
			<tr><td>Latitude:</td>
				<td><input size="12" maxlength='10'  type='text' id='latitude' name='latitude'>
				&nbsp;&nbsp;<a title='Timezone map' target='map' href='https://tasmota-tz.cloudfree.io/'><img src='img/question.png' style="width: 16px"></a></td>
			</tr>
			<tr><td>Longitud:</td>
				<td><input size="12" maxlength='10'  type='text' id='longitude' name='longitude'></td>
			</tr>
			</table>
		</fieldset>
	
		<br>
		<div class="settings" style="display: flex; justify-content: center; align-items: center; height: 52px">
		<button id='save' class='basic-button'> Save </button>&nbsp;&nbsp;
		<button id='close' class='basic-button'> Close </button>
		</div>
       </section>
    </div>

<script src='js/generic.js'></script>
<script src='js/messages.js'></script>
<script src="js/dom_utils.js"></script>
<script src="js/settings.js"></script>
<script src="js/init_page.js"></script>
<script>
<?php include("set_jsenv.php");?>
</script>

</body>
</html>

