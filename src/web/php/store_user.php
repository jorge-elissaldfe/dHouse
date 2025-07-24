<?php
	// dHouse
	// Tasmota devices manager
	// jorge elissalde 2025

	$config = file_get_contents("php://input");
	if (!isset($config))
		die("Unknown var");

	$data = json_decode($config, true);
	$prettyJson = json_encode($data, JSON_PRETTY_PRINT);

	// store configuration into json server file
	@$fp = fopen("../config/users.config", 'w');
	if ($fp !== false) {
		fwrite($fp, $prettyJson);
		fclose($fp);
	}
	else {
		echo "store: error";
		return;
	}
	echo "store: done";
?>