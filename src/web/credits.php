<!DOCTYPE html>
<html lang="en">
<head>
<?php
	// dHouse
	// Tasmota devices manager
	// Jorge Elissalde 2025

	include("config.php");
	include("main_header.php");
?>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About dHouse</title>
	<link rel='stylesheet' href='style/default.css'>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
	<script src='js/generic.js'></script>
</head>

<body>
	<div class="container"> 
		<?php placeMainHeader("About dHouse") ?>
	</div>

<div class="container">
<section class="section">
dHouse is strongly inspired by the eWeLink software.<br>
This code is free to use for non-commercial purposes, whether in its entirety or in parts.<br>
If you find it useful, a mention of my name would be greatly appreciated.<br>
Suggestions, improvements, and modifications are always welcome!<br><br>
Jorge Elissalde 2025<br> 
elissalde.j.e@gmail.com<br>
<br><br>
dHouse version: <?=DHOUSE_VERSION?><br>
<?=uptimeServices()?>
</section>
</div>
<div class="container">
<section class="section">
	<br>
	Credits
	<ul>
	<li><a href='https://tasmota.github.io/docs/About/'>Tasmota</a> firmware 
	<li>Icons by <a href='https://www.flaticon.com'>FlatIcon</a> collections
	<li>Icons by <a href='https://icons8.com'>Icons8</a> collections
	<li>Sonoff DIY by <a href='https://sonoff.tech/'>Sonoff</a>
	<li>eWeLink App by <a href='https://ewelink.cc/'>eWeLink</a>
	</ul>
</section>
</div>
<div class="container">
<section class="section">
	<br>
	GPL Software
	<ul>
	<li>Avahi
	<li>Mosquitto
	<li>SortableJS
	<li>Ntfy
	</ul>
</section>
</div>
<br>
<center><button class='basic-button' type='button' onclick="go_url('index.php')"> Done </button>
<br><br>
<script src='js/init_page.js'></script>
</body>

<?php

function uptimeServices() {
	$command = "ps -eo etime,cmd | grep dhouse | grep -v grep";
	$output = shell_exec($command);
	$outstr = "";
	if ($output) {
	    $lines = explode("\n", trim($output)); 
	    foreach ($lines as $line) {
    	    if (preg_match('/([0-9\-:]+)\s+(.*)/', $line, $matches)) {
            	$etime = $matches[1]; // 6-19:40:17
            	$cmd = $matches[2];   // full cmd
            	$readable = etimeToReadable($etime);
				if (strstr($cmd, "dhouse_proxy.py"))
					$outstr .= "Proxy uptime: " . $readable . "<br>";
				if (strstr($cmd, "dhouse_service.php"))
					$outstr .= "Service uptime: " . $readable . "<br>";
        	}
		}
	} 
	else {
    	return "Services not running<br>";
	}
	return $outstr;
}

function etimeToReadable($etime) {
    $days = 0; $hours = 0; $minutes = 0;
    if (strpos($etime, '-') !== false) {
        list($d, $time) = explode('-', $etime);
        $days = (int)$d;
    } else {
        $time = $etime;
    }
    $parts = explode(':', $time);

    if (count($parts) === 3) {
        list($hours, $minutes, $seconds) = array_map('intval', $parts);
    } elseif (count($parts) === 2) {
        list($minutes, $seconds) = array_map('intval', $parts);
    } else {
        $seconds = (int)$parts[0];
    }

    $str = "";
    if ($days > 0) $str .= "$days days, ";
    if ($hours > 0) $str .= str_pad($hours, 2, "0", STR_PAD_LEFT) . ":";
    if ($minutes > 0) $str .= str_pad($minutes, 2, "0", STR_PAD_LEFT);
	return $str;
}

?>