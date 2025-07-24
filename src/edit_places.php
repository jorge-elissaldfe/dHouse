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
    <title>Edit Places</title>
	<link rel='stylesheet' href='style/default.css'>
	<link rel='stylesheet' href='style/dragdrop.css'>
	<link rel='stylesheet' href='style/schedule.css'>
	<link rel='stylesheet' href='style/messages.css'>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap">
</head>
<body>
	<?php include("messages.html"); ?>
	<div class="container"> 
		<?php placeMainHeader("Edit Places",false,false) ?>

		<!-- device configuration & info icons -->
		<div style='height: 26px'></div>
		<img id="back-image" src="img/back.png" class='menuIconL0 gray-over' title='Go back'>
		</header>
		<div id="main-container"></div>
	</div>

	<div class="overlay" id="overlay"></div>
	<div class="popup" id="popup">
		<strong>Add Place</strong><br><br>
		Place Name:
		<input id='text-new-place' type='text' maxlength=25 style="width: 200px; font-size: 16px"><br><br><br>
		<div id='popup-buttons'>
			<button id='button-accept' type="button" class="small-button">Accept</button>
			<button id='button-cancel' type="button" class="small-button">Cancel</button>
		</div>
	</div>

<script src='js/Sortable.min.js'></script>
<script src='js/generic.js'></script>
<script src='js/messages.js'></script>
<script src='js/dom_utils.js'></script>
<script src='js/edit_places.js'></script>
<script src='js/init_page.js'></script>
<script>
<?php include("set_jsenv.php"); ?>
</script>
</body>
</html>