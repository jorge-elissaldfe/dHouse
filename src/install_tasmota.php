<!DOCTYPE html>
<html lang="en">
<head>
<?php
	// dHouse
	// Tasmota devices manager
	// Jorge Elissalde 2025

	include("config.php");
	include("main_header.php");
	include("sonoff/post_sonoff.php");
?>
	<meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Pragma" content="no-cache">
	<title>Install Tasmota</title>	
	<link rel='stylesheet' href='style/default.css'>
	<link rel='stylesheet' href='style/messages.css'>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
</head>

<body>
	<?php include("messages.html"); ?>
	<div class="container">
		<?php placeMainHeader('Install Tasmota Firmware', false, false)?>
		<div style='height: 26px'></div>
		<img id="back-image" src="img/back.png" class='menuIconL0 gray-over' title='Go back'>
		</header>
        <section class="section" id='install-section'>
			<div id='install-help' style='display: none'>
				<strong>DIY mode from Sonoff</strong><br><br>
				<b>-</b> Long press the button for 5 seconds to enter pairing mode, then press another 5 seconds to enter Compatible Pairing Mode (AP). The LED indicator should blink continuously.<br><br>
				<b>-</b> From mobile phone or PC WiFi setting, an Access Point of the device named ITEAD-XXXXXXXX will be found, connect it with default password 12345678<br><br>
				<b>-</b> Open the browser and access http://10.10.7.1/<br><br>
				<b>-</b> Fill WiFi SSID and password. Once successfully connected, the device is in DIY mode.<br><br>
				<b>-</b> When the device restarts you will be able to find it using Range Search or mDNS Search<br><br>
				<b>-</b> Install Tasmota software and then look for a Wifi Access Point named: tasmota_xxxxx. Connect to this network and access to the IP Address: 192.168.4.1 for Wifi and mqtt server configuration<br><br>
				Excerpt from: <a href='https://tasmota.github.io/docs/Sonoff-DIY/#compatible-devices'>Tasmota/Sonoff DIY</a>
				<br><br>
				<b>Important</b>:<br>
				<div style='padding-left: 30px'>
					Some devices requires a template to correctly enable buttons and functions.&nbsp;
					Check <a href='https://templates.blakadder.com/'>Tasmota Templates</a>
				</div>
			</div>
            <div id='install-main' class="section-content">
                <p>
					<div style="display: flex; align-items: center; gap: 8px;">
  						<h2 style="margin: 0;">Install Tasmota Firmware</h2>
  						<img id="img-help" style="margin-top: 0; cursor: pointer; height: 1.5em;" class="gray-over" src="img/question.png">
    				</div>
					<br>
                    Install Tasmota firmware on a <strong>DIY Sonoff device</strong>.<br> 
                    To set a Sonoff device in DIY mode, follow the 
                    <a href="https://tasmota.github.io/docs/Sonoff-DIY/" target="_blank">Sonoff DIY instructions</a>.
                </p>
                <p>Use <strong>Range Search</strong> or <strong>mDNS Search</strong> to find the device and install Tasmota firmware.</p>
            </div>
        </section>

        <section class="section">
			<div class='div_style' id='rsearch_div'>
            <h2>Range Search</h2>
            	<div class="section-content">
                	<p>Using Range Search requires the device ID shown when you first connect to your Sonoff device.</p>
                	<table>
                        <tr>
                            <td><label for="search_from">Search from address:</label></td>
                            <td>
							<input size="15" maxlength="15" type="text" id="search-from" name="search_from" placeholder="Starting IP">
                            </td>
                        </tr>
                        <tr>
                            <td><label for="search_to">To:</label></td>
                            <td>
							<input size="15" maxlength="15" type="text" id="search-to" name="search_to" placeholder="Ending IP">
                            </td>
                        </tr>
                	</table><br>
                    <button class="basic-button" id='search-iprange' name="search_iprange">Range Search</button>
            	</div>
			</div>
        </section>

        <section class="section">
			<div class='div_style' id='mdns_div'>
            	<h2>mDNS Search</h2>
            	<div class="section-content">
                	<p>
                    You need Avahi server installed on your Linux system.<br> 
					Refer to the <a href="https://wiki.debian.org/Avahi" target="_blank">Avahi installation guide</a> for setup instructions.
					<br>Device discovery via mDNS may not resolve immediately and <b>could require retries</b>.
                	</p>
					<br>
                	<button id="search-mdns" class="basic-button" name="search_mdns">mDNS Search</button>
            	</div>
			</div>
        </section>

		<section id='search_section' class='section' style='display: none'>
			<div class='div_style'>
			<div id='search_text'></div>
			</div>
		</section>

		<section id='device_info_section' class='section' style='display: none'>
			<div class='div_style'>
			<div id='device_info_text'></div>
			</div>
		</section>
    </div>

<script src='js/generic.js'></script>
<script src='js/messages.js'></script>
<script src='js/install_tasmota.js'></script>
<script src='js/init_page.js'></script>
<script>

<?php include("set_jsenv.php"); 
$server_ip = $_SERVER['SERVER_ADDR'] ?? '127.0.0.1';
$from = $to = "";
if (filter_var($server_ip, FILTER_VALIDATE_IP)) {
    $ip_parts = explode('.', $server_ip);
    if (count($ip_parts) === 4) {
        $base = "{$ip_parts[0]}.{$ip_parts[1]}.{$ip_parts[2]}";
        $from = "$base.1";
        $to = "$base.254";
	}
}
echo "const server_from = " . json_encode($from) . ";\n";
echo "const server_to = " . json_encode($to) . ";\n";
?>

</script>
</body>
</html>
