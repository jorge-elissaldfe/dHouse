<?php
	// dHouse
	// Tasmota devices manager
	// jorge elissalde 2025

	session_start();

	if (isset($_GET['config']))
		$config = $_GET['config'];
	if (!isset($config))
		$config = file_get_contents("php://input");
	if (!isset($config))
		die("Unknown var");
	
	$data = json_decode($config, true);
	$prettyJson = json_encode($data, JSON_PRETTY_PRINT);

	// store configuration into json server file
	@rename ("../config/dhouse.config", "../config/dhouse.config.old");
 	@$fp = fopen("../config/dhouse.config", 'w');
	if ($fp !== false) {
		fwrite($fp, $prettyJson);
		fclose($fp);
	}
	else {
		echo "store: error";
		return;
	}

	// reset Apache Session to force reload
	$_SESSION['config'] = "";
	echo "store: done";
?>