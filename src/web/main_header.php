<?php
// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

function placeMainHeader($title, $placeMenu=false, $closeSection=true)
{ ?>

	<!-- main box with name and menu (main_header) -->
	<header class="section" style='background-color: #DDDDDD; position: relative'>
		<div class="header">
			<img alt='Starting - dHouse' id="main-icon" src="img/plug96.png" class="main-icon" title='Main page' style='cursor:pointer'>
			<h2 id='main_title'><?=$title?></h2>
			<?php if ($placeMenu) { ?>

			<div class="dropdown">
				<img alt='Main menu' src='img/menu.png' class="menu-icon" id="menu-icon" title="Main menu">
				<div class="dropdown-content">
					<a href="edit_places.php">Places</a>
					<a href="edit_scenes.php">Scenes</a>
					<a href="log_data.php">View Log</a>
					<hr class='menu-line'>
					<a href="settings.php">Settings</a>
					<hr class='menu-line'>
					<a href="install_tasmota.php">Install Tasmota</a>
					<a href='#' id='check_firmware_version'>Firmware update</a>
					<hr class='menu-line'>
					<a href="credits.php">Credits</a>
				</div>
			</div> 
			<?php }?>

		</div>
	<?php if ($closeSection) { ?>
</header>
<?php }
}
?>