<!DOCTYPE html>
<html lang="en">
<head>
<?php
	// dHouse
	// Tasmota devices manager
	// Jorge Elissalde 2025
	session_start();
	include("main_header.php");
	include("config.php");

	if (!isset($_REQUEST['device']))
		die("<br>Data missing");
	$device = $_REQUEST['device'];

	// memory configuration was not yet updated when data saved
	// keep track of saved switch name
	$savedSwitchName = [];
	$pulse_time = [];
	$modify_device = false;
?>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel='stylesheet' href='style/default.css'>
<link rel='stylesheet' href='style/select.css'>
<link rel='stylesheet' href='style/imageSelector.css'>
<link rel='stylesheet' href='style/messages.css'>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
<title>Device Configuration</title>
</head>

<body>
	<?php include ("messages.html"); ?>
	<div class="container">
		<?php placeMainHeader("",false,false)?>
		<div style='height: 26px'></div>
		<img id="back-image" src="img/back.png" class='menuIconL0 gray-over' title='Go back'>
		<img alt='Device Information' id="device_info" src="img/info.png" class='menuIconR3 gray-over' title='Device Information'>
		<img alt='Advanced' id="advanced-image" src="img/settings.png" class='menuIconR2 gray-over' title='Advanced'>
		<img alt='Remove device' id="remove-image" src="img/remove.png" class='menuIconR1 gray-over' title='Remove Device' > 
		<img alt='Restart device' id="restart-image" src="img/restart.png" title='Restart Device' class='menuIconR0 gray-over'> 
	</header>

   	<section class="section" id='install-section' style='display: none'>
		<br>
		<div class='div_style' id='config_div'>
			<div class='div_text' id='config_div_text'>
			<table cellpadding=0>
				<tr><td><label for="friendly_name">Name:</label></td>
					<td><input type="text" id="friendly_name" name="friendly_name"></td></tr>
				<tr><td><label for="icon">Image:</label></td>
					<td style="width: auto; margin-right: 0px; right: 0px;">
					<select style="width:auto;" name="icon" id="icon" onchange="show_selected_icon()"></select>
					&nbsp;&nbsp;<img id='select-image' title='Select image' style='cursor:pointer; position: relative; top: 2px; width: 15px;' src='img/find_image.png'>
					</td>
				</tr>
				<tr><td></td><td id='icon_view'></td></tr>
				<!-- power switch names -->
				<tr style='display: none' id='multi_switch_device'><td colspan="2"></td></tr>

				<?php if (EXPERIMENTAL_SET_SLEEP_TIME) { ?>
				<!-- sleep cpu time -->
				<tr><td><label for="sleep_time">Sleep Time:</label></td>
					<td><select id="sleep_time" style="width: auto;" name="sleep_time">
						<option value='50'>50</option>";
						<option value='100'>100</option>"
						<option value='200'>200</option>"
						</select>
						&nbsp;<font size=-2>Check Tasmota <a href='https://tasmota.github.io/docs/Dynamic-Sleep/'>Dynamic Sleep</a> for this setting *
					</td>
				</tr>
				<?php } ?>

				<!-- power-on state: on/off for each power switch -->
				<tr id='power_on_device'><td colspan=2></td></tr>
			</table>

			<div id='advanced_options' style='display:none'>
			<br>
			<fieldset>
      			<legend>Advanced</legend>
				<table cellpadding=0 class='none'>
				<!--
				<tr>
					<td><label for="power_led">Power LED:</label></td>
					<td><select id="power_led" style='width: auto'>
						<option value='on'>Yes</option>
						<option value='off'>No</option>
						</select>
					</td>
				</tr>
				-->
				<tr>
					<td><label for="button_delay">Button delay:</label></td>
					<td><select id="button_delay" style='width: auto'>
						<option value='yes'>Yes</option>
						<option value='no'>No</option>
						</select>
					</td>
				</tr>

				<?php if (EXPERIMENTAL_SET_TEMPLATE) { ?>
				<!-- template input: for mobile in next line, not mobile in next cell -->
				<tr><td><a target='templates' href='https://templates.blakadder.com'>Template:</a></td>
					<td><input style='display: none' type='text' id='template_not_mobile' size=53></td>
				</tr>
				<tr id='template_for_mobile' style='display: none'>
					<td id='template_mobile_td' colspan=2>
					<input type='text' id='template_mobile' size=30>
					</td>
				</tr>
				<?php } ?>

				<tr><td><label for="module_type">Module:</label></td>
					<td><select id="module_type" style="width: auto">
						</select>
					</td>
				</tr>
				<?php if (EXPERIMENTAL_BUTTON_HOLD) { ?>
				<tr id='tr_button_hold' style='display: none'>
					<td><label for="button_hold">Button hold:</label></td>
					<td><div id="button_hold_div"></div></td>
				</tr>
				<?php } ?>
				</table>
			</fieldset>
			</div>

			<br>
			<!-- firmware update available message -->
			<section id='firmware_section' class="section" style='display:none;'>
				<div id='div_firmware_update'></div>
			</section>

			<fieldset>
      			<legend>Time zone</legend>
	  			<table>
      				<!-- time zone -->
      				<tr><td>Time zone: </td>
	    				<td><span id='timezone'></span></td>
					</tr>
    				<tr><td>Latitude:</td>
						<td><span id='latitude'></span></td>
					</tr>
    				<tr><td>Longitude: </td>
						<td><span id='longitude'></span></td>
					</tr>
    				<tr><td>Sunrise:</td>
						<td><span id='sunrise'></span></td>
					</tr>
					<tr><td>Sunset: </td>
						<td id='sunset'></td>
					</tr>
					<tr><td></td></tr>
					<tr><td colspan=2>
						<button id='apply_default' class='small-button'>Apply default</button>
						</td>
					</tr>
					<tr><td colspan=2></td></tr>
	  			</table>
	  			<div style="padding-left: 6px">
					<p class="note">Check Settings option for Latitude and Longitude default values.<br>
					 Latitude and Longitude values might be modified by the device.<br>
					 Sunrise and sunset adjustment may take a while.
					 </p>
	  			</div>
  			</fieldset>
			<br>
			<div class="settings" style="display: flex; justify-content: center; align-items: center; height: 52px">
				<button id='save_button' class='basic-button'> Save </button>&nbsp;&nbsp;
				<button id='close_button' class='basic-button'> Close </button>
			</div>

<?php if (EXPERIMENTAL_SET_SLEEP_TIME)	{ ?>
			<br><font size=-1>* Higher values might cause missed or delayed buttons detection.<br>
<?php } ?>
			
		</div>
	</div>
	</section>
	</div>


	<!-- modal for icons gallery -->
	<div id="imageModal" class="modal">
		<div class="modal-content">
   			<h3>Select image</h3>
    		<div class="gallery" id="gallery">
    		<?php
	       		$imagenes = glob("img/devices/*.png");
   				foreach ($imagenes as $imagen) {
 		       		$nombre = basename($imagen);
       				echo "<img style='width: 24px' src='$imagen' alt='$nombre' data-img-name='$nombre'>";
    			}
    		?>
			</div>
		</div>
	</div>
	
<script src='js/mqtt_tasmota.js'></script>
<script src='js/generic.js'></script>
<script src='js/messages.js'></script>
<script src='js/dom_utils.js'></script>
<script src='js/config_tasmota.js'></script>
<script src='js/init_page.js'></script>
<script>
<?php 
include("set_jsenv.php"); 
place_js_iconarray();
?>
</script>
</body>
</html>
