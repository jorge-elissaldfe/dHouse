<!DOCTYPE html>
<html lang="en">
<head>
<?php
	// dHouse
	// Tasmota devices manager
	// jorge elissalde 2025
	//
	// TODO: add session_start to all php
	session_start();
	include("config.php"); 
	include("main_header.php");
?>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>dHouse</title>
	<link rel='stylesheet' href='style/default.css'>
	<link rel='stylesheet' href='style/dropdown.css'>
	<link rel='stylesheet' href='style/slider.css'>
	<link rel='stylesheet' href='style/select.css'>
	<link rel='stylesheet' href='style/dragdrop.css'>
	<link rel='stylesheet' href='style/scenes.css'>
	<link rel='stylesheet' href='style/messages.css'>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap">
</head>

<body>
	<?php include ("messages.html"); ?>
    <div class="container" id="container">
	<!-- main box with name and menu -->
        <?php placeMainHeader("Scenes",false,false)?>
		<div style='height: 26px'></div>
		<img id="back-image" src="img/back.png" class='menuIconL0 gray-over' title='Go back'>
		</header>

		<!-- application settings -->
        <section id='scenes-section' class="section">
			<div id='scenes-data'>
			</div>
			<br>
			<div id='scenes-div'>
				<table id='scenes-table' class='scenes-table'>
				</table>
				<br>
				<button id='add-scene' class='basic-button'> Add Scene </button> 
			</div>
        </section>

		<section id='add_scene_section' class="section" style='display: none'>
			<div id='add-button-data'>
				<b>Add Scene</b><br><br>
				<table style='margin-left: -4px;'>
					<tr><td><label for="scene-name">Name:</label></td>
						<td><input type='text' id='scene-name' maxlength=24 style='width: 200px; font-size: 16px'></td>
					</tr>
					<tr><td><label for="enable-scene">Enable:</label></td>
						<td>
						<label class='switch'>
						<input type='checkbox' id='enable-scene'>
						<span class='slider round'></span>
						</label>
						</td>
					</tr>
					<tr><td><label for="show-shortcut">Shortcut:</label></td>
						<td>
						<label class='switch'>
						<input type='checkbox' id='show-shortcut'>
						<span class='slider round'></span>
						</label>
						<font size=-1>&nbsp;show in main bar</font>
						</td>
					</tr>
					<tr><td style="height: 10px"></td></tr>
				</table>

				<!-- trigger table -->
				<fieldset style="border: 1px solid #cecece; padding: 10px;">
  				<legend style="font-weight: bold;">Triggers</legend>
					<table class='empty-table' id='triggers-table'>
 						<colgroup>
    					<col>
    					<col>
						<col>
  						</colgroup>
						<tr id='trigger-keepRow'><td style="height: 10px"></td></tr> 
						<tr id='triggersTR'><td style="height=15px"></td></tr> 
					</table>
					<input id='button-add-trigger' class='small-button' type='button' value='Add Trigger'>
				</fieldset>
				<br>
				<!-- actions table -->
				<fieldset style="border: 1px solid #cecece; padding: 10px;">
  				<legend style="font-weight: bold;">Actions</legend>
					<table class='empty-table' id='actions-table'>
 						<colgroup>
    					<col>
    					<col>
						<col>
  						</colgroup>
						<tr id='action-keepRow'>
							<td style="height: 10px"></td>
							<td></td>
							<td></td>
						</tr>
						<tr id='actionsTR'><td></td></tr>
					</table>

					<br>
					<input id='button-add-action' class='small-button' type='button' value='Add Action''>
				</fieldset>

				<div id='scene-condition'></div>
				<br>

				<div class="settings" style="display: flex; justify-content: center; align-items: center; height: 52px">
					<button id='save-button' class='basic-button' disabled> Save </button>&nbsp;&nbsp; 
					<button id='close-add-scene' class='basic-button'> Close </button> 
				</div>
			</div>
		</section>
    </div>

<script src='js/generic.js'></script>
<script src='js/device_misc.js'></script>
<script src='js/messages.js'></script>
<script src='js/mqtt_tasmota.js'></script>
<script src='js/init_page.js'></script>
<script src='js/dom_utils.js'></script>
<script src='js/edit_scenes.js'></script>
<script>
<?php include("set_jsenv.php"); ?>
const CMD_RUN_SCENE = <?=json_encode(CMD_RUN_SCENE);?>;

</script>
</body>
</html>


