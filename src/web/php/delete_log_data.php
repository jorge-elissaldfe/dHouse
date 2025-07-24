<?php

	// dHouse
	// Tasmota devices manager
	// jorge elissalde 2025
	//
	// delete log data for a device

	if (!isset($_REQUEST['device']))
		die ("Device missing");

	include ("../config.php");

	$device = $_REQUEST['device'];			// could be 'all'
	$db = "";

	if (($status=connectSQL())!==true) 
		die ("Error opening database: $status");

	$data = [];

	// avoid collecting not required data like id, command, device (already known) and friendlyName
	if ($device == 'all')
		die("Could not remove all data");

	$stmt = $db->prepare('DELETE FROM log WHERE device = :device');
	$stmt->bindValue(':device', $device, SQLITE3_TEXT);
	$result = $stmt->execute();
	$db->close();
	return "done";
	
	function connectSQL() {
		global $db;
		
		try {
			$db = new SQLite3(LOG_DATABASE);
		}
		catch (Exception $e) {
			return $e;
		}
		return true;
	}

?>


