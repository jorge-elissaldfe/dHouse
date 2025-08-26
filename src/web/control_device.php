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

	$device = $_REQUEST['device'];
	if (empty($device))
    	die("Data missing");
?>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>dHouse</title>
	<link rel='stylesheet' href='style/default.css'>
	<link rel='stylesheet' href='style/slider.css'>
	<link rel='stylesheet' href='style/select.css'>
	<link rel='stylesheet' href='style/powerButton.css'>
	<link rel='stylesheet' href='style/schedule.css'>
	<link rel='stylesheet' href='style/messages.css'>
	<link rel='stylesheet' href='style/imageSelector.css'>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet"> 
</head>
<body>
	<?php include("messages.html"); ?>
	<div id='main_container' class="container">
		<?php placeMainHeader("", false, false)?>
		<!-- device configuration & info icons -->
		<div style='height: 26px'></div>
		<img id="back-image" src="img/back.png" class='menuIconL0 gray-over' title='Go back'>
		<img id="settings-image" src="img/settings.png" class='menuIconR3 gray-over' title='Configuration'>		
		<img id="notify-image" src="img/notify.png" class='menuIconR2 gray-over' title='Notifications'> 
		<img id="log-image" src="img/log.png" class='menuIconR1 gray-over' title='Log'>
		<img id="change-switch-image" src="img/image-edit.png" class='menuIconR0 gray-over' title='Change Switch image'>
	</header>

	<section id='button_section' class="section" style='display:none'>

			<!-- box for timer message when running, time to end timer -->
			<div class='power-button' id='timer_msg'></div>
			<!-- multi button power ON/OFF -->
			<div id='multi-power-button' class="power-button" style="padding: 0 0 20px; position: relative; max-width: 300px; margin: 0 auto; gap: 45px;"></div>
			<!-- single button power ON/OFF -->
        	<div class="power-button" style="padding: 0 0 80px; position: relative; width: 100%"> 
				<!-- 
				button initially disabled and not shown until data received from mqtt 
				button will be set when receiving multi power status 
				-->
				<!-- <img disabled id="single-power-button" src="img/power_off.png" width="96px" style='cursor: pointer; display:none; user-select: none; -ms-user-select: none; -webkit-user-drag: none;'>  -->
				<img id="single-power-button" style='cursor: pointer; display:none; user-select: none; -ms-user-select: none; -webkit-user-drag: none;'> 
				<!-- timer & schedule icons -->
				<img id="open-timer-image" src="img/timer.png" class="iconPointer" style="position: absolute; bottom: 5px;  left: 25px;" title='Timers' class='gray-over'>
				<img id="open-schedule-image" src="img/schedule.png" class="iconPointer" style="position: absolute; bottom: 3px; left: 65px;" title='Schedule' class='gray-over'>
				<img id='all-on' title='All switches on' src='img/all-on.png' class="iconPointer" style="position: absolute; bottom: 10px; right:65px; display:none;">
				<img id='all-off' title='All switches off' class="iconPointer" src='img/all-off.png' style="position: absolute; bottom: 10px; right: 25px; display:none;">
			</div>	

	</section>
	<!-- timer input data -->
	<section id='timer-section' class="section" style='display:none'>
			<div class="schedule">
			<table>
			<tr>
				<td>Timers</td>
				<td><img id="add_user_timer" src='img/add.png' title='Add timer'></td>
				</tr>
				<tr><td style="height: 12px;"></td></tr>
			</table>
			</div>
			<div class="timers" id='timer-set'></div>
			<div class="timers" id='timer-data'></div>
			<div style="display:flex; justify-content: center;">
				<br>
				<button id='save-timers-data' title='Save timers' type='button' style='display: none;  margin-top: 20px;' class='small-button'>Save</button> 
			</div>
	</section>
	<!-- schedule input data -->
	<section id='schedule-section' class="section" style='padding-left: 0px !important; padding-right: 0px !important; display: none'>
			<div class="schedule">
				<table>
				<tr>
					<td>Schedule</td>
					<td><img alt='Add schedule' id="add_schedule_image" src="img/add.png" title='Add schedule'></td>
				</tr>
				<tr><td colspan=2 style="height: 12px;"></td></tr>
				</table>
				<div id='schedule-data'>
				</div>
			</div>
	</section>
	</div>
	<?php include("schedule_popup.html"); ?>


	<!-- modal for icons gallery -->
	<div id="imageModal" class="modal">
		<div class="modal-content" style="width: 50% !important">
   			<h3>Select switch image</h3>
    		<div class="gallery" id="gallery">
    		<?php
	       		$images = glob("img/switch*.png");
   				foreach ($images as $img) {
					if (strstr($img, "-on")!==false)
						continue;
 		       		$name = basename($img);
       				echo "<img style='height: 32px; width: auto' src='$img' alt='$name' data-img-name='$name'>";
    			}
    		?>
			</div>
		</div>
	</div>

<script src='js/generic.js'></script>
<script src='js/select.js'></script>
<script src='js/mqtt_tasmota.js'></script>
<script src='js/timer.js'></script>
<script src='js/schedule.js'></script>
<script src='js/messages.js'></script>
<script src='js/dom_utils.js'></script>
<script src='js/control_device.js'></script>
<script src='js/init_page.js'></script>
<script>
<?php include("set_jsenv.php"); ?>

def_timer_action = <?=json_encode($_SESSION["timer_action"] ?? "") . ";\n"; ?>
def_hour = <?= isset($_SESSION["hour"]) ? $_SESSION["hour"]:"''" . ";\n"?>
def_min = <?= isset($_SESSION["min"]) ? $_SESSION["min"]:"''" . ";\n"?>

</script>
</body>
</html>
