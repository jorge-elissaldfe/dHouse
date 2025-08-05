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
    <link rel="manifest" href="/manifest.json">
	<link rel="icon" href="img/plug96.png" sizes="96x96" type="image/png">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>dHouse</title>
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
        <?php placeMainHeader("",true)?>
		<!-- new Tasmota device detected popup box, intially hidden -->
		<section class="section-green" id="new_device_box" style="display: none">
			<div class="header-column" id="div_new_device"></div>
		</section>
		<!-- generic popup box -->
		<section class="section" id="generic_box" style="display: none">
			<div class="header" id="generic_box_data"></div>
		</section>
		<!-- application settings -->
        <section class="section" style="margin-bottom: 3px">
            <div class="settings" style="position: relative;">
				<label for="select-places">Place</label>
				<div class="select-container">
				<select id="select-places">
					<option value="All">All</option>
				</select>
				</div>	
				<img alt="Places" id="edit-places" src="img/edit.png" title="Edit Places" class="gray-over">
				<img alt="Scenes" id="edit-scenes" src="img/scene.png" title="Scenes" class="gray-over">
				<img alt="Log" id="log-data" src="img/log.png" title="Log" class="gray-over">
				<img alt="Arrange" id="arrange-devs" src="img/dots.png" title="Arrange devices" class="submenuIconR0 gray-over">
			</div>
        </section>
		<div id='scenes-shortcut'>
		</div>
		<!-- devices and actions -->
        <div id="device-list" style="margin-top: 7px">
		</div>
    </div>

<script src='js/Sortable.min.js'></script>
<script src="js/mqtt_tasmota.js"></script>
<script src="js/generic.js"></script>
<script src="js/tasmota.js"></script>
<script src='js/messages.js'></script>
<script src="js/dom_utils.js"></script>
<script src="js/index_shortcuts.js"></script>
<script src="js/index.js"></script>
<script src="js/init_page.js"></script>
<script>
<?php include("set_jsenv.php"); ?>
const CMD_RUN_SCENE = <?=json_encode(CMD_RUN_SCENE);?>;
</script>
</body>
</html>

