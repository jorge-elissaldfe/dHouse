<?php
	// dHouse
	// Tasmota devices manager
	// jorge elissalde 2025
	// allowed vars to be stored in configuration, just to avoid hacks

	$allow_var = Array("notify");

	if (isset($_GET['notify']))
		$notify = $_GET['notify'];
	if (!isset($notify))
		$notify = file_get_contents("php://input");
	if (!isset($notify))
		die("Unknown var");
	
	$data = json_decode($notify, true);
	$prettyJson = json_encode($data, JSON_PRETTY_PRINT);

	// store configuration into json server file
	@rename ("../config/notify.config", "../config/notify.config.old");
	$fp = fopen("../config/notify.config", 'w');
	fwrite($fp, $prettyJson);
	fclose($fp);
	echo "store: done";
?>