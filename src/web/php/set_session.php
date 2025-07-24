<?php
	// dHouse
	// Tasmota devices manager
	// jorge elissalde 2025
	// allowed vars to be stored in session, just to avoid hacks
	$allow_var = Array("tasmota_firmware","hour","min","timer_action","selected_place");

	// set session var
	session_start();
	foreach ($_GET as $key => $val)
	{
		if (array_search($key, $allow_var) === false)
			die("Unknown var");
		$_SESSION[$key] = $val;
	}
	echo "session: done";
?>