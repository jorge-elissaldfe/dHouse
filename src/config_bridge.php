<!DOCTYPE html>
<html lang="en">
<head>
<?php
	// dHouse
	// Tasmota devices manager
	// jorge elissalde 2025

	session_start();
	include("config.php");
	include("main_header.php");

	if (!isset($_REQUEST['device']))
		die("<br>Data missing");
	$device = $_REQUEST['device'];

?>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>dHouse</title>
	<link rel="stylesheet" href="style/default.css">
	<link rel="stylesheet" href="style/dropdown.css">
	<link rel="stylesheet" href="style/slider.css">
	<link rel="stylesheet" href="style/select.css">
	<link rel="stylesheet" href="style/dragdrop.css">
	<link rel="stylesheet" href="style/messages.css">
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
</head>

<body>
	<?php include("messages.html"); ?>
    <div class="container" id="container">
		<!-- main box with name and menu -->
        <?php placeMainHeader("Bridge",false,false)?>
		<!-- settings & info icons -->
		<div style="height: 26px"></div>
		<img id="back-image" src="img/back.png" class='menuIconL0 gray-over' title='Go back'>
		<img id="settings-image" src="img/settings.png" class="menuIconR0 gray-over" title="Configuration">
		</header>

		<!-- application settings -->
        <section id="buttons-section" class="section">
			<div id="buttons-data">
			</div>
			<br>
			<div class="settings" style="display: flex; justify-content: center; align-items: center; height: 52px">
			<button id="add-button" class="basic-button"> Add RF Button </button>
			</div>
			<br><br>
			<div id="user-message" style="display:none">
				<font size="-1"><center>Pressing the remote RF button will blink the corresponding image for connectivity test.</center></font>
			</div>
        </section>

		<section id="add_button_section" class="section" style="display: none">
				<div id="add-button-data">
					<b>Add Button</b><br><br>
					Ready to get button ID.<br>
					Press remote button three times.<br><br>
					<div id="flash_image_button" style="height: 24px">
						<table><tr>
							<td><img id="remote_img_0" src="img/remote-control.png" style="display: none"></td>
							<td><img id="remote_img_1" src="img/remote-control.png" style="display: none"></td>
							<td><img id="remote_img_2" src="img/remote-control.png" style="display: none"></td>
						</tr></table>
					</div>
					<br><br>
					<table cellspacing="0" cellpadding="0" style="margin-left: -4px;">
						<tr><td>Button ID:</td>
							<td><input type="text" id="button-id" maxlength="25" style="width: 200px; font-size: 16px" disabled></td>
						</tr>
						<tr><td>Button Name:</td>
 							<td><input type="text" id="button-name" maxlength="25" style="width: 200px; font-size: 16px" disabled></td>
						</tr>
					</table>
					<br>
					<button id="save-button" class="basic-button" disabled> Save </button>
					<button id="cancel-button" class="basic-button"> Cancel </button>
				</div>
		</section>
    </div>
<script src="js/mqtt_tasmota.js"></script>
<script src="js/generic.js"></script>
<script src="js/tasmota.js"></script>
<script src="js/messages.js"></script>
<script src="js/dom_utils.js"></script>
<script src="js/config_bridge.js"></script>
<script src="js/init_page.js"></script>
<script>
<?php include("set_jsenv.php"); ?>
</script>

</body>
</html>

