<?php

	// dHouse
	// Tasmota devices manager
	// jorge elissalde 2025
	//
	// retrieve log required data

	if (!isset($_REQUEST['device']))
		die ("Device missing");

	include ("../config.php");

	$offset = $_REQUEST['offset'] ?? 0;		// query offset 
	$limit = $_REQUEST['limit'] ?? 15;		// query limit
	$device = $_REQUEST['device'];			// could be 'all'
	$db = "";

	if (($status=connectSQL())!==true) 
		die ("Error opening database: $status");

	$data = [];

	// avoid collecting not required data like id, command, device (already known) and friendlyName
	if ($device == 'all')
		$q = "select device,date,command,FriendlyName,data,source from log order by date desc,data limit $limit offset $offset";
	else
		$q = "select device,date,command,FriendlyName,data,source from log where device='$device' order by date desc,data limit $limit offset $offset";

	try {
		$result = $db->query($q);
		while ($row = $result->fetchArray(SQLITE3_ASSOC)) 
			$data[] = $row;
		$db->close();
	}
	catch (Exception $e) {
		echo $e->getMessage();
		return;
	}
	$json = json_encode($data);
	echo $json;

	function connectSQL() {
		global $db;
		
		try {
			$db = new SQLite3(LOG_DATABASE);
		}
		catch (Exception $e) {
			return $e;
		}
		$db->enableExceptions(true);	
		return true;
	}

?>


