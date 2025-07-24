<!DOCTYPE html>
<html lang="en">
<head>
<?php
	// dHouse
	// Tasmota devices manager
	// Jorge Elissalde 2025

	ini_set('display_errors', 1);
	ini_set('display_startup_errors', 1);
	error_reporting(E_ALL);

	session_start();
	include("config.php");
	include("sonoff/post_sonoff.php");
	include("php/generic.php");
	include("main_header.php");

	if (isset($_GET['ip']) && isset($_GET['deviceid'])) {
		$ip = $_GET['ip'];
		$deviceid = $_GET['deviceid'];
	}
	else
		die("Missing parameters");
?>
	<meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel='stylesheet' href='style/default.css'>
	<link rel='stylesheet' href='style/messages.css'>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
 	<title>Install Tasmota firmware</title>
	<script>
	<?php include("set_jsenv.php"); ?>
	</script>
	<script src='js/messages.js'></script>	
	<script src='js/generic.js'></script>
	<script src='js/tasmota.js'></script>
</head>
<body>
	<?php include ("messages.html"); ?>
	<div class="container">
		<?php placeMainHeader('Install Tasmota Firmware')?>
    	<section class="section" id='install-section'>
		<fieldset>
   			<legend>Sonoff Device Information</legend>
			<div class='div_style' id='device_info'></div>
			<div class='div_text' id='device_info_text'></div>
		</fieldset>
		<br>
		<div id='spinner'>Device accessing ... <br><img src='img/spinner.gif'><br><br></div>
	
		<div class='div_style' id='device_install'>
		<div class='div_title'><strong>Install Tasmota firmware</strong><br><br></div>
		<div class='div_text' id='device_info_text' style='width: 100%'>
		Tasmota version to install: <b><span id='install_version'></span></b><br>
		<b>Important:</b> select [lite] release for Sonoff MINI<br>
		Tasmota release to install: 
		<select id='tasmota_release' name='tasmota_release' onchange='onChangeTasmotaTelease()'></select>
		<br><br>
		<div class='div_select_info' id='select_release_info'><i>Release information from Tasmota project:</i><br><br>tasmota.bin = The Tasmota version with most drivers for 1M+ flash. RECOMMENDED RELEASE BINARY</div>
		</div>
	</div>
		<center>
		<br><br>
		<button id='install-button' class='basic-button'> Install </button>&nbsp;&nbsp;
		<button class='basic-button' onclick="history.go(-1)"> Close </button>
		</center>
<script>

device_ip = '<?=$ip?>';
device_id = '<?=$deviceid?>';
tasmota_releases = <?=json_encode($tasmota_releases);?>;

async function getSonoffDeviceInfo () {
	const url = `/php/get_sonoff_info.php?ip=${device_ip}&deviceid=${device_id}`;
	r = await get_url_content(url);
	let s = JSON.parse(r);

	if (s == null)
		return;

	let html = "<table>";
	Object.entries(s.data).forEach(([key, value]) => {
		if (key == "deviceid" || key == "fwVersion" || key == "otaUnlock" || key == "bssid") {
			html += "<tr><td>" + key + "</td>";
			html += "<td>" + value + "</td></tr>";
		}
	});
	html += "</table>";
	$("device_info_text").innerHTML = html;
}

if (lastTasmotaFirmware === "") {
	let html = "Error getting current Tasmota version from the address:<br>";
	html += "<a href='<?=TASMOTA_LAST_VERSION?>'><?=TASMOTA_LAST_VERSION?></a><br><br>";
	$("device_info_text").innerHTML = html;
}
else
	getSonoffDeviceInfo();

$("spinner").style.display = "none";

// otaInstall($ip, $deviceid, $tasmota_release);



/*if (preg_match('#release-([\d\.]+)/#',TASMOTA_FIRMWARE, $matches)) 
    $install_version = $matches[1];
else
	$install_version = $_SESSION['tasmota_firmware']; // $tasmota_version; // "last available"; // TASMOTA_FIRMWARE;
*/

function showVersionToInstall() {

	let install_version = lastTasmotaFirmware;
	const firmware = '<?=TASMOTA_FIRST_FIRMWARE?>';
	const regex = /release-([\d.]+)\//;
	const matches = firmware.match(regex);

	if (matches) {
  		install_version = matches[1];
	}
	else {
/*
		echo "You can upgrade to the latest version later<br>";
		echo "Last release: {$_SESSION['tasmota_firmware']}<br><br>";
*/
	}
console.log ("install version: " + install_version);
	$("install_version").innerHTML = install_version;
}

async function installFirmware() {

	if (!await showConfirm("Install Tasmota Firmware to this device?"))
		return;

	$("install-button").style.display = "none";	

	const tasmotaReleaseIndex = $('tasmota_release').value;
	const tasmotaRelease = tasmota_releases[tasmotaReleaseIndex];
	let tasmotaFilename = "tasmota.bin";
	let firmware_url = "<?=TASMOTA_FIRST_FIRMWARE?>";
	if (tasmotaRelease == "bin")
		firmware_url += "tasmota.bin";
	else {
		firmware_url += `tasmota-${tasmotaRelease}.bin`;
		tasmotaFilename = `tasmota-${tasmotaRelease}.bin`;
	}

	$("device_install").innerHTML = `<b>Installing Tasmota</b><br><br>\
Sonoff device: ${device_id} / ${device_ip}<br>\
Tasmota file: ${tasmotaFilename}<br>\
Firmware url: ${firmware_url}<br>\
<br>Setting otaUnlock feature:`;

	//
	// unlock device
	//	
	$("spinner").style.display = "block";
	let url = `/php/set_ota_unlock.php?ip=${device_ip}&deviceid=${device_id}`;
	let r = await get_url_content(url);
	$("spinner").style.display = "none";

	if (r != 'Done') {
		$("device_install").innerHTML += "<br><b>Error:</b> Could not set unlock mode<br>";
		return ;
	}
	else
		$("device_install").innerHTML += " Done.";

	//
	// install firmware
	//
	$("device_install").innerHTML += "<br>Installing firmware: ";
	url = `/php/set_ota_firmware.php?ip=${device_ip}&deviceid=${device_id}&tasmota_filename=${tasmotaFilename}&firmware_url=${firmware_url}`;
	$("spinner").style.display = "block";
	r = await get_url_content(url);
	r = r.replace(/\s+/g, "");
	$("spinner").style.display = "none";
	if (r != 'Done') {
		$("device_install").innerHTML += "<b>Error.</b><br>" + r;
		return;
	}
	$("device_install").innerHTML += "Done. <b><br><br>Installation finished</b><br><br>Look for an AP wifi connection named <b>tasmota_nnnnnn</b> that your Sonoff device will start. Connect to this wifi and open the page at: http://192.168.4.1<br>\
Once connected configure your wifi network and the address of the <b>mqqt</b> server<br>";
}

function onChangeTasmotaTelease() {
	// show tasmota_release_info from 'tasmota.js'
	var s = $('tasmota_release');
	var div = $('select_release_info');
	var t = "<i>Release information from Tasmota project:</i><br><br>";
	t += tasmota_release_info[s.value];
	div.innerHTML = t;
}

function fillTasmotaReleaseSelect(){
	const select = $("tasmota_release");
	Object.entries(tasmota_releases).forEach(([key, value]) => {
		const option = document.createElement("option");
		option.value = key;
		option.textContent = value;
		select.appendChild(option);
	});
}

function setupNavigation() {
	$('install-button')?.addEventListener("click", () => installFirmware());
	$('main-icon')?.addEventListener("click", () => go_url("index.php"));
}

showVersionToInstall();
fillTasmotaReleaseSelect();
// force div_select_info to show the right information for current selected release
onChangeTasmotaTelease();
setupNavigation();

</script>
</div>
</body>
</html>