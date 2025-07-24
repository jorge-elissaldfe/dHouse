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
    <title>dHouse Credits</title>
	<link rel='stylesheet' href='style/default.css'>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
	<script src='js/generic.js'></script>
</head>

<body>
	<div class="container"> 
		<?php placeMainHeader("dHouse Credits") ?>
	</div>

<div class="container">
<section class="section">

dHouse is strongly inspired by the eWeLink software.<br>
This code is free to use for non-commercial purposes, whether in its entirety or in parts.<br>
If you find it useful, a mention of my name would be greatly appreciated.<br>
Suggestions, improvements, and modifications are always welcome!<br><br>
Jorge Elissalde 2025<br> 
elissalde.j.e@gmail.com<br>
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