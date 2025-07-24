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
?>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>dHouse</title>
	<link rel="stylesheet" href="style/default.css">
	<link rel="stylesheet" href="style/dropdown.css">
	<link rel="stylesheet" href="style/slider.css">
	<link rel="stylesheet" href="style/select.css">
	<link rel="stylesheet" href="style/messages.css">
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap">
</head>

<body>
	<?php include("messages.html"); ?>
    <div class="container" id="container">
		<!-- main box with name and menu -->
        <?php placeMainHeader("Log Data Viewer",false,false)?>
		<div style="height: 26px"></div>
		<img id="back-image" alt="Go Back" src="img/back.png" class="menuIconL0 gray-over" title="Go back">
		<img id="remove_log" alt="Delete log" title="Delete log" style="display: none;" class="menuIconR0 gray-over iconPointer" src="img/remove.png">
		</header>

		<!-- application settings -->
        <section id="buttons-section" class="section">
			<table>
				<tr><td><label for="device-list">Device:</label></td>
					<td><select id="device-list" style="width: 200px">
						<option value="all">All devices</option>
						</select>
					</td>
					<td><img id="refresh_log" alt="Refresh" title="Refresh" style="cursor: pointer; width: 26px" src="img/refresh_black.png"></td>
				</tr>
			</table>
        </section>

		<section id="log-data" class="section" style="display: none; overflow-x: auto">
		</section>

		<div style="display:flex; justify-content: center; align-items: center;">
		<button id="prev-button" style="display: none" type="button" class="small-button" title="Previous">&lt;&lt;</button>
		<div style="width: 15px"></div>
		<button id="next-button" style="display: none" type="button" class="small-button" title="Next">&gt;&gt;</button>
		</div>
    </div>

<script src="js/messages.js"></script>
<script src="js/log_data.js"></script>
<script src="js/generic.js"></script>
<script src="js/dom_utils.js"></script>
<script src="js/init_page.js"></script>
<script>
<?php include("set_jsenv.php"); ?>
</script>
</body>
</html>

