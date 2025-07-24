<?php
// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

require("post_sonoff.php");

$search_from = $_GET["from"] ?? null;
$search_to = $_GET["to"] ?? null;

if (!isset($search_from) || !isset($search_to))
	die("Missing parameters");

echo json_encode (discover_sonoff_byip($search_from, $search_to));

?>
